module bluefin_foundation::isolated_trading {

    use sui::object::{Self, ID};
    use sui::table::{Self, Table};
    use sui::tx_context::{TxContext};
    use sui::event::{emit};
    use sui::transfer;


    // custom modules
    use bluefin_foundation::perpetual::{Self, Perpetual};
    use bluefin_foundation::position::{Self, UserPosition};
    use bluefin_foundation::evaluator::{Self, TradeChecks};
    use bluefin_foundation::signed_number::{Self, Number};
    use bluefin_foundation::order::{Self, Order, OrderStatus};
    use bluefin_foundation::library::{Self};
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::roles::{SubAccounts};

    // friend modules
    friend bluefin_foundation::exchange;

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct TradeExecuted has copy, drop {
        sender:address,
        perpID: ID,
        tradeType: u8,
        maker: address,
        taker: address,
        makerOrderHash: vector<u8>,
        takerOrderHash: vector<u8>,
        makerMRO: u128,
        takerMRO: u128,
        makerFee: u128,
        takerFee: u128,
        makerPnl: Number,
        takerPnl: Number,
        tradeQuantity: u128,
        tradePrice: u128,
        isBuy: bool
    }


    //===========================================================//
    //                           STORAGE                         //
    //===========================================================//

    struct TradeData has drop, copy {
        makerSignature:vector<u8>,
        takerSignature:vector<u8>,
        makerPublicKey:vector<u8>,
        takerPublicKey:vector<u8>,

        makerOrder: Order,
        takerOrder: Order,
        fill:Fill,
        currentTime: u64
    }

    struct Fill has drop, copy {
        quantity: u128,
        price: u128
    }

    struct IMResponse has drop {
        fundsFlow: Number,
        pnl: Number,
        fee: u128
    }

    struct TradeResponse has copy, store, drop {
        makerFundsFlow: Number,
        takerFundsFlow: Number,
        fee: u128
    }

    //===========================================================//
    //                      CONSTANTS
    //===========================================================//

    // trade type constants
    const TRADE_TYPE: u8 = 1;

    // action types
    const ACTION_TRADE: u8 = 0;


    //===========================================================//
    //                      INITIALIZATION                       //
    //===========================================================//

    fun init(ctx: &mut TxContext) {        
        // create orders filled quantity table
        let orders = table::new<vector<u8>, OrderStatus>(ctx);
        transfer::public_share_object(orders);   
    }


    //===========================================================//
    //                      TRADE METHOD
    //===========================================================//


    // @dev only exchange module can invoke this
    public (friend) fun trade(
        sender: address, 
        perp: &mut Perpetual,
        ordersTable: &mut Table<vector<u8>,OrderStatus>,
        subAccounts: &SubAccounts,
        data: TradeData):TradeResponse
        {
            let fill = data.fill;
            let currentTime  = data.currentTime;
            let makerSignature = data.makerSignature;
            let takerSignature = data.takerSignature;
            let makerPublicKey = data.makerPublicKey;
            let takerPublicKey = data.takerPublicKey;

            let makerOrder = &mut data.makerOrder;            
            let takerOrder = &mut data.takerOrder;


            assert!(
                order::isBuy(*makerOrder) != 
                order::isBuy(*takerOrder),
                error::order_cannot_be_of_same_side());

            let oraclePrice = perpetual::priceOracle(perp);
            let tradeChecks = perpetual::checks(perp);
            let makerFee = perpetual::makerFee(perp);
            let takerFee = perpetual::takerFee(perp);
            let perpID = object::uid_to_inner(perpetual::id(perp));
            let imr = perpetual::imr(perp);
            let mmr = perpetual::mmr(perp);
            let positionsTable = perpetual::positions(perp);


            // // get order hashes
            let makerOrderSerialized = order::get_serialized_order(*makerOrder);
            let takerOrderSerialized = order::get_serialized_order(*takerOrder);

            let makerHash = library::get_hash(makerOrderSerialized);
            let takerHash = library::get_hash(takerOrderSerialized);
            
            // if maker/taker orders are coming on-chain for first time, add them to order table
            order::create_order(ordersTable, makerHash);
            order::create_order(ordersTable, takerHash);
                  

            // if taker order is market order
            if(order::price(*takerOrder) == 0){
                order::set_price(takerOrder, fill.price);    
            };

            // update orders to have non decimal based leverage
            let makerLeverage = library::round_down(order::leverage(*makerOrder));
            order::set_leverage(makerOrder, makerLeverage);
            let takerLeverage = library::round_down(order::leverage(*takerOrder));
            order::set_leverage(takerOrder, takerLeverage);


            let initMakerPos = *table::borrow(positionsTable, order::maker(*makerOrder));
            let initTakerPos = *table::borrow(positionsTable, order::maker(*takerOrder));

            // Validate orders are correct and can be executed for the trade
            verify_order(initMakerPos, ordersTable, subAccounts, *makerOrder, makerOrderSerialized, makerHash, makerSignature, makerPublicKey, fill, currentTime, 0);
            verify_order(initTakerPos, ordersTable, subAccounts, *takerOrder, takerOrderSerialized, takerHash, takerSignature, takerPublicKey, fill, currentTime, 1);

            // verify pre-trade checks
            evaluator::verify_price_checks(tradeChecks, fill.price);
            evaluator::verify_qty_checks(tradeChecks, fill.quantity);
            evaluator::verify_market_take_bound_checks(
                tradeChecks, fill.price, oraclePrice, order::isBuy(*takerOrder));

            // Self-trade prevention; only fill order and return
            if (order::maker(*makerOrder) == order::maker(*takerOrder)) {
                return TradeResponse{
                    makerFundsFlow: signed_number::new(),
                    takerFundsFlow: signed_number::new(),
                    fee:0
                }
            };


            // apply isolated margin
            let makerResponse = apply_isolated_margin(
                tradeChecks,
                table::borrow_mut(positionsTable, order::maker(*makerOrder)), 
                *makerOrder, 
                fill, 
                library::base_mul(fill.price, makerFee),
                0);

            let takerResponse = apply_isolated_margin(
                tradeChecks,
                table::borrow_mut(positionsTable, order::maker(*takerOrder)), 
                *takerOrder, 
                fill, 
                library::base_mul(fill.price, takerFee),
                1);


            let newMakerPosition = *table::borrow(positionsTable, order::maker(*makerOrder));
            let newTakerPosition = *table::borrow(positionsTable, order::maker(*takerOrder));
                                   
            // verify collateralization of maker and take
            position::verify_collat_checks(
                initMakerPos, 
                newMakerPosition, 
                imr, 
                mmr, 
                oraclePrice, 
                TRADE_TYPE, 
                0);

            position::verify_collat_checks(
                initTakerPos, 
                newTakerPosition, 
                imr, 
                mmr, 
                oraclePrice, 
                TRADE_TYPE, 
                1);           

            position::emit_position_update_event(newMakerPosition, sender, ACTION_TRADE);
            position::emit_position_update_event(newTakerPosition, sender, ACTION_TRADE);
    
            emit(TradeExecuted{
                sender,
                perpID,
                tradeType: TRADE_TYPE,
                maker: order::maker(*makerOrder),
                taker: order::maker(*takerOrder),
                makerOrderHash: makerHash,
                takerOrderHash: takerHash,
                makerMRO: position::mro(newMakerPosition),
                takerMRO: position::mro(newTakerPosition),
                makerFee: makerResponse.fee,
                takerFee: takerResponse.fee,
                makerPnl: makerResponse.pnl,
                takerPnl: takerResponse.pnl,
                tradeQuantity: fill.quantity,
                tradePrice: fill.price,
                isBuy: order::isBuy(*takerOrder),
            });


            return TradeResponse{
                makerFundsFlow: makerResponse.fundsFlow,
                takerFundsFlow: takerResponse.fundsFlow,
                fee: takerResponse.fee + makerResponse.fee
            }          
    }

    //===========================================================//
    //                      FRIEND METHODS
    //===========================================================//
    
    public (friend) fun pack_trade_data(
         // maker
        makerFlags:u8,
        makerPrice: u128,
        makerQuantity: u128,
        makerLeverage: u128,
        makerAddress: address,
        makerExpiration: u64,
        makerSalt: u128,
        makerSignature:vector<u8>,
        makerPublicKey:vector<u8>,

        // taker
        takerFlags:u8,
        takerPrice: u128,
        takerQuantity: u128,
        takerLeverage: u128,
        takerAddress: address,
        takerExpiration: u64,
        takerSalt: u128,
        takerSignature:vector<u8>,
        takerPublicKey:vector<u8>,

        // fill
        quantity: u128, 
        price: u128,

        // perp address
        perpetual:address,

        // current time
        currentTime:u64,

    ): TradeData{
        let makerOrder = order::pack_order(perpetual, makerFlags, makerPrice, makerQuantity, makerLeverage, makerAddress, makerExpiration, makerSalt);
        let takerOrder = order::pack_order(perpetual, takerFlags, takerPrice, takerQuantity, takerLeverage, takerAddress, takerExpiration, takerSalt);
        let fill = Fill{quantity, price};
        return TradeData{makerOrder, takerOrder, fill, makerSignature, takerSignature, makerPublicKey, takerPublicKey, currentTime}
    }


    public (friend) fun makerFundsFlow(resp:TradeResponse): Number{
        return resp.makerFundsFlow
    }
    
    public (friend) fun takerFundsFlow(resp:TradeResponse): Number{
        return resp.takerFundsFlow
    }

    public (friend) fun fee(resp:TradeResponse): u128{
        return resp.fee
    }

    public (friend) fun tradeType() : u8 {
        return TRADE_TYPE
    }

    //===========================================================//
    //                      HELPER METHODS
    //===========================================================//
    


    fun verify_order(pos: UserPosition, ordersTable: &mut Table<vector<u8>, OrderStatus>, subAccounts: &SubAccounts, userOrder: Order, orderSerialized: vector<u8>, hash: vector<u8>, signature: vector<u8>, publicKey: vector<u8>, fill:Fill, currentTime: u64, isTaker: u64){

            // if a taker order, must have post only false else
            // it can only be a maker order
            assert!(isTaker == 0 || !order::postOnly(userOrder), error::taker_order_can_not_be_post_only());       

            assert!(isTaker == 1 || !order::ioc(userOrder),  error::maker_order_can_not_be_ioc());

            order::verify_order_state(ordersTable, hash, isTaker);

            let sigMaker = order::verify_order_signature(subAccounts, order::maker(userOrder), orderSerialized, signature, publicKey, isTaker);

            order::verify_order_expiry(order::expiration(userOrder), currentTime, isTaker);

            order::verify_order_leverage(position::mro(pos), order::leverage(userOrder), isTaker);

            order::verify_and_fill_order_qty(
                ordersTable, 
                userOrder, 
                hash, 
                fill.price,
                fill.quantity,
                position::isPosPositive(pos),
                position::qPos(pos),
                sigMaker,
                isTaker);
    }

    /*
     * @notice applies isolated margin logic for settling trade to the maker/taker of the trade
     * All fees are rounded down, in favor of the user.
     */
    fun apply_isolated_margin(checks:TradeChecks, balance: &mut UserPosition, order:Order, fill:Fill, feePerUnit: u128, isTaker: u64): IMResponse {
        
        let fundsFlow: Number;
        let equityPerUnit: Number;
        let marginPerUnit: u128;

        let isBuy = order::isBuy(order);
        
        let oiOpen = position::oiOpen(*balance);
        let qPos = position::qPos(*balance);
        let isPosPositive = position::isPosPositive(*balance);
        let margin = position::margin(*balance);
        let mro = library::compute_mro(order::leverage(order));
        let pnlPerUnit = position::compute_pnl_per_unit(*balance, fill.price);

        // case 1: Opening position or adding to position size
        if (qPos == 0 || isBuy == isPosPositive) {
            
            // price * mro
            marginPerUnit = library::base_mul(fill.price, mro);

            // quantity *  ((price * mro) + fee per unit )
            fundsFlow = signed_number::from(library::base_mul(fill.quantity, marginPerUnit + feePerUnit), true);

            // current oi open + quantity * price
            position::set_oiOpen(balance, oiOpen + library::base_mul(fill.quantity, fill.price));

            // current position size + fill quantity
            position::set_qPos(balance, qPos + fill.quantity);

            // current margin + (quantity * (price * mro)) 
            position::set_margin(balance, margin + library::base_mul(fill.quantity, marginPerUnit));

            position::set_isPosPositive(balance, isBuy);

            // verify that oi open checks still hold                       
            evaluator::verify_oi_open_for_account(
                checks, 
                mro,
                position::oiOpen(*balance),
                isTaker
            );

        pnlPerUnit = signed_number::new();
        } 
        // case 2: Reduce only order
        else if (order::reduceOnly(order) || ( isBuy != isPosPositive && fill.quantity <= qPos)){
            // current position - fill quantity
            let newQPos = qPos - fill.quantity;

            // current margin / current position size
            marginPerUnit = library::base_div(margin, qPos);

            // equityPerUnit + marginPerUnit
            equityPerUnit = signed_number::add_uint(pnlPerUnit, marginPerUnit);            

            assert!(signed_number::gte_uint(equityPerUnit, 0), error::loss_exceeds_margin(isTaker));
            
            // Max(0, equityPerUnit);
            let posValue = signed_number::positive_value(equityPerUnit);
            feePerUnit = if ( feePerUnit > posValue ) { posValue } else { feePerUnit };

            // ((-pnl per unit + fee per unit) * fill quantity) 
            // - ((current user margin * fill quantity) / current user position size)  
            fundsFlow = signed_number::sub_uint( 
                signed_number::mul_uint(
                    signed_number::add_uint(
                        signed_number::negate(pnlPerUnit), 
                        feePerUnit), 
                    fill.quantity),
                (margin * fill.quantity) / qPos);


            fundsFlow = signed_number::negative_number(fundsFlow);

            // this pnl is no longer per unit now
            pnlPerUnit = signed_number::mul_uint(pnlPerUnit, fill.quantity);
            
            // (current margin * new pos size) / old pos size
            position::set_margin(balance, (margin * newQPos) / qPos);

            // (current oi open * new pos size) / old pos size
            position::set_oiOpen(balance, (oiOpen * newQPos) / qPos);

            position::set_qPos(balance, newQPos);

        } 
        // case 3: flipping position side
        else {
            
            // fill quantity - current position size
            let newQPos = fill.quantity - qPos;

            // new position size * fill price
            let updatedOIOpen = library::base_mul(newQPos, fill.price);

            // current margin / current position size
            marginPerUnit = library::base_div(margin, qPos);

            // pnl per unit + margin per unit
            equityPerUnit = signed_number::add_uint(pnlPerUnit, marginPerUnit);            

            assert!(signed_number::gte_uint(equityPerUnit, 0), error::loss_exceeds_margin(isTaker));

            // Max(0, equityPerUnit);
            let posValue = signed_number::positive_value(equityPerUnit);

            // fee paid on closing the current position            
            let closingFeePerUnit = if ( feePerUnit > posValue ) { posValue } else { feePerUnit };
            

            // (((-pnl per unit + closing fee per unit) * current position size) - margin)
            // + (new user position size * ((fill price * mro) + fee per unit)) 
            fundsFlow = signed_number::add_uint(
                            signed_number::sub_uint( 
                                signed_number::mul_uint(
                                    signed_number::add_uint(
                                        signed_number::negate(pnlPerUnit), 
                                        closingFeePerUnit), 
                                    qPos),
                                margin),
                            library::base_mul(
                                newQPos,
                                library::base_mul(
                                    fill.price, 
                                    mro) 
                                + feePerUnit)
                        );

            // ((current position size * closing fee) + (new position size * fee per unit)) / fill quantity
            feePerUnit = library::base_div(
                library::base_mul(qPos, closingFeePerUnit) +
                library::base_mul(newQPos,feePerUnit),
                fill.quantity
            );

            pnlPerUnit = signed_number::mul_uint(pnlPerUnit, qPos);

            // verify that oi open checks still hold                       
            evaluator::verify_oi_open_for_account(
                checks, 
                mro,
                updatedOIOpen,
                isTaker
            );

            position::set_qPos(balance, newQPos);
            
            // (new position size * fill price)
            position::set_oiOpen(balance, updatedOIOpen);

            // margin = (quantity - qPos) * (price * mro)
            position::set_margin(balance, library::base_mul(newQPos, library::base_mul(fill.price, mro)));
                        
            position::set_isPosPositive(balance, !isPosPositive);

        };

        position::set_mro(balance, mro);

        return IMResponse {
            fundsFlow: fundsFlow,
            pnl: pnlPerUnit,
            fee: library::base_mul(feePerUnit, fill.quantity)
        }

    }




}
