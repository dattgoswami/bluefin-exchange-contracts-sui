module bluefin_foundation::isolated_trading {

    use sui::object::{Self, ID};
    use sui::table::{Self, Table};
    use sui::tx_context::{TxContext};
    use sui::event::{emit};
    use std::vector;
    use std::hash;
    use sui::bcs;
    use sui::ecdsa_k1;
    use sui::transfer;


    // custom modules
    use bluefin_foundation::perpetual::{Self, Perpetual};
    use bluefin_foundation::position::{Self, UserPosition};
    use bluefin_foundation::evaluator::{Self, TradeChecks};
    use bluefin_foundation::signed_number::{Self, Number};
    use bluefin_foundation::price_oracle::{Self};
    use bluefin_foundation::library::{Self};
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::roles::{Self, SubAccounts};

    // friend modules
    friend bluefin_foundation::exchange;

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct OrderFill has copy, drop {
        orderHash:vector<u8>,
        order: Order,
        sigMaker: address,
        fill: u128,
        filledQuantity: u128        
    }

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

    struct Order has drop, copy {
        market:address,
        maker: address,
        isBuy: bool,
        reduceOnly: bool,
        price: u128,
        quantity: u128,
        leverage: u128,
        expiration: u128,
        salt: u128
    }

    struct OrderStatus has store, drop {
        status: bool,
        filledQty: u128
    }

    struct TradeData has drop, copy {
        makerSignature:vector<u8>,
        takerSignature:vector<u8>,
        makerOrder: Order,
        takerOrder: Order,
        fill:Fill
    }

    struct Fill has drop, copy {
        quantity: u128,
        price: u128
    }

    struct IMResponse has store, drop {
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
        transfer::share_object(orders);   
    }


    //===========================================================//
    //                      TRADE METHOD
    //===========================================================//

    public (friend) fun trade(
        sender: address, 
        perp: &mut Perpetual,
        ordersTable: &mut Table<vector<u8>,OrderStatus>,
        subAccounts: &SubAccounts,
        data: TradeData):TradeResponse
        {
            assert!(perpetual::is_trading_permitted(perp), error::perpetual_is_denied_trading());
            assert!(
                data.makerOrder.isBuy != data.takerOrder.isBuy, 
                error::order_cannot_be_of_same_side());

            let oraclePrice = price_oracle::price(perpetual::priceOracle(perp));
            let tradeChecks = perpetual::checks(perp);
            let makerFee = perpetual::makerFee(perp);
            let takerFee = perpetual::takerFee(perp);
            let perpID = object::uid_to_inner(perpetual::id(perp));
            let imr = perpetual::imr(perp);
            let mmr = perpetual::mmr(perp);
            let positionsTable = perpetual::positions(perp);

            // // if maker/taker positions don't exist create them
            position::create_position(perpID, positionsTable, data.makerOrder.maker);
            position::create_position(perpID, positionsTable, data.takerOrder.maker);

            // // get order hashes
            let makerHash = get_hash(data.makerOrder);
            let takerHash = get_hash(data.takerOrder);

            // if maker/taker orders are coming on-chain for first time, add them to order table
            create_order(ordersTable, makerHash);
            create_order(ordersTable, takerHash);

            // if taker order is market order
            if(data.takerOrder.price == 0){
                data.takerOrder.price = data.fill.price;    
            };

            // update orders to have non decimal based leverage
            data.makerOrder.leverage = library::round_down(data.makerOrder.leverage);
            data.takerOrder.leverage = library::round_down(data.takerOrder.leverage);

            let initMakerPos = *table::borrow(positionsTable, data.makerOrder.maker);
            let initTakerPos = *table::borrow(positionsTable, data.takerOrder.maker);

            // Validate orders are correct and can be executed for the trade
            verify_order(initMakerPos, ordersTable, subAccounts, data.makerOrder, makerHash, data.makerSignature, data.fill, 0);
            verify_order(initTakerPos, ordersTable, subAccounts, data.takerOrder, takerHash, data.takerSignature, data.fill, 1);

            // verify pre-trade checks
            evaluator::verify_price_checks(tradeChecks, data.fill.price);
            evaluator::verify_qty_checks(tradeChecks, data.fill.quantity);
            evaluator::verify_market_take_bound_checks(tradeChecks, data.fill.price, oraclePrice, data.takerOrder.isBuy);

            // Self-trade prevention; only fill order and return
            if (data.makerOrder.maker == data.takerOrder.maker) {
                return TradeResponse{
                    makerFundsFlow: signed_number::new(),
                    takerFundsFlow: signed_number::new(),
                    fee:0
                }
            };


            // apply isolated margin
            let makerResponse = apply_isolated_margin(
                tradeChecks,
                table::borrow_mut(positionsTable, data.makerOrder.maker), 
                data.makerOrder, 
                data.fill, 
                library::base_mul(data.fill.price, makerFee),
                0);

            let takerResponse = apply_isolated_margin(
                tradeChecks,
                table::borrow_mut(positionsTable, data.takerOrder.maker), 
                data.takerOrder, 
                data.fill, 
                library::base_mul(data.fill.price, takerFee),
                1);


            let newMakerPosition = *table::borrow(positionsTable, data.makerOrder.maker);
            let newTakerPosition = *table::borrow(positionsTable, data.takerOrder.maker);
                                   
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

            position::emit_position_update_event(perpID, data.makerOrder.maker, newMakerPosition, ACTION_TRADE);
            position::emit_position_update_event(perpID, data.takerOrder.maker, newTakerPosition, ACTION_TRADE);

    
            emit(TradeExecuted{
                sender,
                perpID,
                tradeType: TRADE_TYPE,
                maker: data.makerOrder.maker,
                taker: data.takerOrder.maker,
                makerOrderHash: makerHash,
                takerOrderHash: takerHash,
                makerMRO: position::mro(newMakerPosition),
                takerMRO: position::mro(newTakerPosition),
                makerFee: makerResponse.fee,
                takerFee: takerResponse.fee,
                makerPnl: makerResponse.pnl,
                takerPnl: takerResponse.pnl,
                tradeQuantity: data.fill.quantity,
                tradePrice: data.fill.price,
                isBuy: data.takerOrder.isBuy,
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
        makerIsBuy: bool,
        makerPrice: u128,
        makerQuantity: u128,
        makerLeverage: u128,
        makerReduceOnly: bool,
        makerAddress: address,
        makerExpiration: u128,
        makerSalt: u128,
        makerSignature:vector<u8>,

        // taker
        takerIsBuy: bool,
        takerPrice: u128,
        takerQuantity: u128,
        takerLeverage: u128,
        takerReduceOnly: bool,
        takerAddress: address,
        takerExpiration: u128,
        takerSalt: u128,
        takerSignature:vector<u8>,

        // fill
        quantity: u128, 
        price: u128,

        // perp address
        perpetual:address

    ): TradeData{
        let makerOrder = pack_order(perpetual, makerIsBuy, makerPrice, makerQuantity, makerLeverage, makerReduceOnly, makerAddress, makerExpiration, makerSalt);
        let takerOrder = pack_order(perpetual, takerIsBuy, takerPrice, takerQuantity, takerLeverage, takerReduceOnly, takerAddress, takerExpiration, takerSalt);
        let fill = Fill{quantity, price};
        return TradeData{makerOrder, takerOrder, fill, makerSignature, takerSignature}

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



    //===========================================================//
    //                      HELPER METHODS
    //===========================================================//

    

    fun pack_order(
        market: address,
        isBuy: bool,
        price: u128,
        quantity: u128,
        leverage: u128,
        reduceOnly: bool,
        maker: address,
        expiration: u128,
        salt: u128,
    ): Order {
        return Order {
                market,
                maker,
                isBuy,
                price,
                quantity,
                leverage,
                reduceOnly,
                expiration,
                salt
        }
    }

    fun get_hash(order:Order): vector<u8>{
        
        /*
        serializedOrder
         [0,15]     => price            (128 bits = 16 bytes)
         [16,31]    => quantity         (128 bits = 16 bytes)
         [32,47]    => leverage         (128 bits = 16 bytes)
         [48,63]    => expiration       (128 bits = 16 bytes)
         [64,79]    => salt             (128 bits = 16 bytes)
         [80,99]   => maker     (160 bits = 20 bytes)
         [100,119]   => market     (160 bits = 20 bytes)
         [120,120]  => reduceOnly       (1 byte)
         [121,121]  => isBuy            (1 byte)
        */

        let serialized_order = vector::empty<u8>();
        let price_b = bcs::to_bytes(&order.price);
        let quantity_b = bcs::to_bytes(&order.quantity);
        let leverage_b = bcs::to_bytes(&order.leverage);
        let maker_address_b = bcs::to_bytes(&order.maker); // doesn't need reverse
        let market_address_b = bcs::to_bytes(&order.market); // doesn't need reverse
        let expiration_b = bcs::to_bytes(&order.expiration);
        let salt_b = bcs::to_bytes(&order.salt);
        let reduce_only_b = bcs::to_bytes(&order.reduceOnly);
        let is_buy_b = bcs::to_bytes(&order.isBuy);

        vector::reverse(&mut price_b);
        vector::reverse(&mut quantity_b);
        vector::reverse(&mut leverage_b);
        vector::reverse(&mut expiration_b);
        vector::reverse(&mut salt_b);

        vector::append(&mut serialized_order, price_b);
        vector::append(&mut serialized_order, quantity_b);
        vector::append(&mut serialized_order, leverage_b);
        vector::append(&mut serialized_order, expiration_b);
        vector::append(&mut serialized_order, salt_b);
        vector::append(&mut serialized_order, maker_address_b);
        vector::append(&mut serialized_order, market_address_b);
        vector::append(&mut serialized_order, reduce_only_b);
        vector::append(&mut serialized_order, is_buy_b);


        return hash::sha2_256(serialized_order)

    }

    fun create_order(ordersTable: &mut Table<vector<u8>, OrderStatus>, hash: vector<u8>){
        // if the order does not already exists on-chain
        if (!table::contains(ordersTable, hash)){
            table::add(ordersTable, hash, OrderStatus {status:true, filledQty: 0});
        };
    }


    fun verify_order(position: UserPosition, ordersTable: &mut Table<vector<u8>, OrderStatus>, subAccounts: &SubAccounts, order: Order, hash: vector<u8>, signature: vector<u8>, fill:Fill, isTaker: u64){

            verify_order_state(ordersTable, hash, isTaker);

            let sigMaker = verify_order_signature(subAccounts, order.maker, hash, signature, isTaker);

            verify_order_expiry(order, isTaker);

            verify_order_fills(position, order, fill, isTaker);

            verify_order_leverage(position, order, isTaker);

            verify_and_fill_order_qty(ordersTable, order, hash, fill.quantity, sigMaker, isTaker);
    }

    fun verify_order_state(ordersTable: &mut Table<vector<u8>, OrderStatus>, hash:vector<u8>, isTaker:u64){        
        let order = table::borrow(ordersTable, hash);
        assert!(order.status, error::order_is_canceled(isTaker));
    }

    fun verify_and_fill_order_qty(ordersTable: &mut Table<vector<u8>, OrderStatus>, order:Order, orderHash:vector<u8>, fill:u128, sigMaker:address, isTaker:u64){
        
        let orderStatus = table::borrow_mut(ordersTable, orderHash);
        orderStatus.filledQty = orderStatus.filledQty + fill;

        assert!(orderStatus.filledQty  <=  order.quantity,  error::cannot_overfill_order(isTaker));

        emit(OrderFill{
                orderHash,
                order,
                sigMaker,
                fill,
                filledQuantity: orderStatus.filledQty
            });
    }


    fun verify_order_signature(subAccounts: &SubAccounts, maker:address, hash:vector<u8>, signature: vector<u8>, isTaker:u64):address{

        let publicKey = ecdsa_k1::ecrecover(&signature, &hash);

        let publicAddress = library::get_public_address(publicKey);

        assert!(maker == publicAddress || roles::is_sub_account(subAccounts, maker, publicAddress), error::order_has_invalid_signature(isTaker));

        return publicAddress
    }

    fun verify_order_expiry(order:Order, isTaker:u64){
        // TODO compare with chain time
        assert!(order.expiration == 0 || order.expiration > 1, error::order_expired(isTaker));
    }

    fun verify_order_fills(userPosition: UserPosition, order:Order, fill:Fill, isTaker:u64){

        // Ensure order is being filled at the specified or better price
        // For long/buy orders, the fill price must be equal or lower
        // For short/sell orders, the fill price must be equal or higher
        let validPrice = if (order.isBuy) { fill.price <= order.price } else {fill.price >= order.price};

        assert!(validPrice, error::fill_price_invalid(isTaker));

        // For reduce only orders, ensure that the order would result in an
        // open position's size to reduce (fill amount <= open position size)
        if(order.reduceOnly){

            // Reduce only order must be in the opposite direction as open position 
            // (a positive position size means open position is Buy)
            // Reduce only order size must be less than open position size.
            // Size sign is stored separately (sizeIsPositive) so this is an absolute value comparison
            // regardless of position direction (Buy or Sell)
            assert!(
                order.isBuy != position::isPosPositive(userPosition) && 
                fill.quantity <= position::qPos(userPosition), 
                error::fill_does_not_decrease_size(isTaker));        
        }

    }

    fun verify_order_leverage(userPosition: UserPosition, order:Order, isTaker:u64){
        let mro = position::mro(userPosition);
        assert!(order.leverage > 0, error::leverage_must_be_greater_than_zero(isTaker));        
        assert!(
            mro == 0 || position::compute_mro(order.leverage) == mro, 
            error::invalid_leverage(isTaker));

    }

    /*
     * @notice applies isolated margin logic for settling trade to the maker/taker of the trade
     * All fees are rounded down, in favor of the user.
     */
    fun apply_isolated_margin(checks:TradeChecks, balance: &mut UserPosition, order:Order, fill:Fill, feePerUnit: u128, isTaker: u64): IMResponse {
        
        let fundsFlow: Number;
        let equityPerUnit: Number;
        let marginPerUnit: u128;

        let isBuy = order.isBuy;
        
        let oiOpen = position::oiOpen(*balance);
        let qPos = position::qPos(*balance);
        let isPosPositive = position::isPosPositive(*balance);
        let margin = position::margin(*balance);
        let mro = position::compute_mro(order.leverage);
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
        else if (order.reduceOnly || ( isBuy != isPosPositive && fill.quantity <= qPos)){
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
            
            // (new position size * fill price) * mro
            position::set_margin(balance, library::base_mul(updatedOIOpen, mro));
            
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
