
module bluefin_exchange::perpetual {

    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};
    use std::string::{Self, String};
    use sui::transfer;
    use sui::event::{emit};
    use sui::table::{Self, Table};
    use sui::ecdsa_k1;

    // custom modules
    use bluefin_exchange::position::{Self, UserPosition};
    use bluefin_exchange::price_oracle::{Self, OraclePrice, UpdateOraclePriceCapability};
    use bluefin_exchange::evaluator::{Self, TradeChecks};
    use bluefin_exchange::order::{Self, Order};
    use bluefin_exchange::library::{Self};
    use bluefin_exchange::signed_number::{Self, Number};
    use bluefin_exchange::error::{Self};
    use bluefin_exchange::margin_math::{Self};

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct PerpetualCreationEvent has copy, drop {
        id: ID,
        name: String,
        checks:TradeChecks,
        initialMarginRequired: u128,
        maintenanceMarginRequired: u128,
        makerFee: u128,
        takerFee: u128,
    }

    struct OperatorUpdateEvent has copy, drop {
        account:address,
        status: bool
    }
    
    struct OrderFillEvent has copy, drop {
        orderHash:vector<u8>,
        order: Order,
        fill: u128,
        newFilledQty: u128        
    }

    struct AccountPositionUpdateEvent has copy, drop {
        perpID: ID,
        account:address,
        position:UserPosition,
        action: u64
    }

    struct TradeExecutedEvent has copy, drop {
        perpID: ID,
        tradeType: u64,
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

    struct AdminCap has key {
        id: UID,
    }
     

    struct Perpetual has key, store {
        id: UID,
        /// name of perpetual
        name: String,
        /// Trade Checks
        checks: TradeChecks,
        /// imr: the initial margin collateralization percentage
        initialMarginRequired: u128,
        /// mmr: the minimum collateralization percentage
        maintenanceMarginRequired: u128,
        /// Default maker order fee for this Perpetual
        makerFee: u128,
        /// Default taker order fee for this Perpetual
        takerFee: u128,
        /// table containing user positions for this market/perpetual
        positions: Table<address,UserPosition>,
        /// PriceOracle
        oraclePrice: OraclePrice
    }

    struct OrderStatus has store, drop {
        status: bool,
        filledQty: u128
    }


    struct IMResponse has store, drop {
        fundsFlow: Number,
        pnlPerUnit: Number,
        feePerUnit: u128
    }

    //===========================================================//
    //                      INITIALIZATION
    //===========================================================//

    fun init(ctx: &mut TxContext) {
        // giving deployer the admin cap
        let admin = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(admin, tx_context::sender(ctx));

        // create settlement operators table
        let settlementOperators = table::new<address, bool>(ctx);
        transfer::share_object(settlementOperators);   


        // create orders filled quantity table
        let orders = table::new<vector<u8>, OrderStatus>(ctx);
        transfer::share_object(orders);   
    }

    
    //===========================================================//
    //                      ENTRY METHODS
    //===========================================================//


    /**
     * Updates status(active/inactive) of settlement operator
     * Only Admin can invoke this method
     */
    public entry fun set_settlement_operator(_:&AdminCap, operatorTable: &mut Table<address, bool>, operator:address, status:bool){
        if(table::contains(operatorTable, operator)){
            assert!(status == false, error::operator_already_whitelisted_for_settlement());
            table::remove(operatorTable, operator); 
        } else {
            assert!(status == true, error::operator_not_found());
            table::add(operatorTable, operator, true);
        };

        emit(OperatorUpdateEvent {
            account: operator,
            status: status
        });
    }

    /**
     * Creates a perpetual
     * Only Admin can create one
     * Transfers adminship of created perpetual to admin
     */
    public entry fun create_perpetual(
        _: &AdminCap, 
        name: vector<u8>, 
        minPrice: u128,
        maxPrice: u128,
        tickSize: u128,
        minQty: u128,
        maxQtyLimit: u128,
        maxQtyMarket: u128,
        stepSize: u128,
        mtbLong: u128,
        mtbShort: u128,
        maxAllowedOIOpen: vector<u128>,
        initialMarginRequired: u128,
        maintenanceMarginRequired: u128,
        makerFee: u128,
        takerFee: u128,
        maxAllowedPriceDiffInOP: u128,
        ctx: &mut TxContext
        ){
        

        let id = object::new(ctx);
        let perpID = object::uid_to_inner(&id);

        let positions = table::new<address, UserPosition>(ctx);

        let checks = evaluator::initTradeChecks(
            minPrice,
            maxPrice,
            tickSize,
            minQty,
            maxQtyLimit,
            maxQtyMarket,
            stepSize,
            mtbLong,
            mtbShort,
            maxAllowedOIOpen
            );

        let oraclePrice = price_oracle::initOraclePrice(
            0, 
            maxAllowedPriceDiffInOP,
            0, 
            perpID, 
            tx_context::sender(ctx), 
            ctx
        );

        let perpetual = Perpetual {
            id: id,
            name: string::utf8(name),
            checks,
            initialMarginRequired,
            maintenanceMarginRequired,
            makerFee,
            takerFee,
            positions,
            oraclePrice
        };

        emit(PerpetualCreationEvent {
            id: perpID,
            name: perpetual.name,
            checks,
            initialMarginRequired,
            maintenanceMarginRequired,
            makerFee,
            takerFee    
        });


        transfer::share_object(perpetual);

    }

    /**
     * Updates minimum price of the perpetual 
     * Only Admin can update price
     */
    public entry fun set_min_price( _: &AdminCap, perpetual: &mut Perpetual, minPrice: u128){
        evaluator::set_min_price(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, minPrice);
    }   

    /** Updates maximum price of the perpetual 
     * Only Admin can update price
     */
    public entry fun set_max_price( _: &AdminCap, perpetual: &mut Perpetual, maxPrice: u128){
        evaluator::set_max_price(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, maxPrice);
    }   

    /**
     * Updates step size of the perpetual 
     * Only Admin can update size
     */
    public entry fun set_step_size( _: &AdminCap, perpetual: &mut Perpetual, stepSize: u128){
        evaluator::set_step_size(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, stepSize);
    }   

    /**
     * Updates tick size of the perpetual 
     * Only Admin can update size
     */
    public entry fun set_tick_size( _: &AdminCap, perpetual: &mut Perpetual, tickSize: u128){
        evaluator::set_tick_size(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, tickSize);
    }   

    /**
     * Updates market take bound (long) of the perpetual 
     * Only Admin can update MTB long
     */
    public entry fun set_mtb_long( _: &AdminCap, perpetual: &mut Perpetual, mtbLong: u128){
        evaluator::set_mtb_long(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, mtbLong);
    }  

    /**
     * Updates market take bound (short) of the perpetual 
     * Only Admin can update MTB short
     */
    public entry fun set_mtb_short( _: &AdminCap, perpetual: &mut Perpetual, mtbShort: u128){
        evaluator::set_mtb_short(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, mtbShort);
    }   

    /**
     * Updates maximum quantity for limit orders of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun set_max_qty_limit( _: &AdminCap, perpetual: &mut Perpetual, quantity: u128){
        evaluator::set_max_qty_limit(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, quantity);
    }   

    /**
     * Updates maximum quantity for market orders of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun set_max_qty_market( _: &AdminCap, perpetual: &mut Perpetual, quantity: u128){
        evaluator::set_max_qty_market(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, quantity);
    }  

    /**
     * Updates minimum quantity of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun set_min_qty( _: &AdminCap, perpetual: &mut Perpetual, quantity: u128){
        evaluator::set_min_qty(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, quantity);
    }   

    /**
     * updates max allowed oi open for selected mro
     * Only Admin can update max allowed OI open
     */
    public entry fun set_max_oi_open( _: &AdminCap, perpetual: &mut Perpetual, maxLimit: vector<u128>){
        evaluator::set_max_oi_open(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, maxLimit);
    }


    /**
     * Used to perofrm on-chain trade between two orders (maker/taker)
     */ 
    public entry fun trade(
        perpetual: &mut Perpetual, 
        operatorTable: &mut Table<address, bool>,
        ordersTable: &mut Table<vector<u8>, OrderStatus>,

        // maker
        makerTriggerPrice: u128,
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
        takerTriggerPrice: u128,
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
        fillQuantity: u128, 
        fillPrice: u128,
        
        ctx: &mut TxContext        
        ){

            let perpID = object::uid_to_inner(&perpetual.id);
            let sender = tx_context::sender(ctx);

            let oraclePrice = price_oracle::price(perpetual.oraclePrice);

            // check if caller has permission to trade on taker's behalf
            assert!(has_account_permission(operatorTable, takerAddress, sender), error::sender_has_no_taker_permission());

            assert!(makerIsBuy != takerIsBuy, error::order_cannot_be_of_same_side());

            // if maker/taker positions don't exist create them
            create_position(perpID, &mut perpetual.positions, makerAddress);
            create_position(perpID, &mut perpetual.positions, takerAddress);

            // TODO check if trading is allowed by guardian for given perpetual or not

            // TODO check if trading is started or not

            // TODO apply funding rate

            let makerOrder = order::pack_object(makerTriggerPrice, makerIsBuy, makerPrice, makerQuantity, makerLeverage, makerReduceOnly, makerAddress, makerExpiration, makerSalt);
            let takerOrder = order::pack_object(takerTriggerPrice, takerIsBuy, takerPrice, takerQuantity, takerLeverage, takerReduceOnly, takerAddress, takerExpiration, takerSalt);

            // get order hashes
            let makerHash = order::get_hash(makerOrder, perpID);
            let takerHash = order::get_hash(takerOrder, perpID);

            // if maker/taker orders are coming on-chain for first time, add them to order table
            create_order(ordersTable, makerHash);
            create_order(ordersTable, takerHash);

            // if taker order is market order
            if(takerPrice == 0){    
                order::set_price(&mut takerOrder, fillPrice);
            };

            // update orders to have non decimal based leverage
            order::set_leverage(&mut makerOrder, get_precise_leverage(makerLeverage));
            order::set_leverage(&mut takerOrder, get_precise_leverage(takerLeverage));

            // Validate orders are correct and can be executed for the trade
            verify_order(perpetual, ordersTable, makerOrder, makerHash, makerSignature, fillQuantity, fillPrice, 0);
            verify_order(perpetual, ordersTable, takerOrder, takerHash, takerSignature, fillQuantity, fillPrice, 1);

            // verify pre-trade checks
            evaluator::verify_price_checks(perpetual.checks, fillPrice);
            evaluator::verify_qty_checks(perpetual.checks, fillQuantity);
            evaluator::verify_market_take_bound_checks(perpetual.checks, fillPrice, oraclePrice, takerIsBuy);

            let initMakerPosition = *table::borrow(&mut perpetual.positions, makerAddress);
            let initTakerPosition = *table::borrow(&mut perpetual.positions, takerAddress);

            // apply isolated margin
            let makerResponse = apply_isolated_margin(
                perpetual.checks,
                table::borrow_mut(&mut perpetual.positions, makerAddress), 
                makerOrder, 
                fillQuantity, 
                fillPrice, 
                library::base_mul(fillPrice, perpetual.makerFee),
                0);

            let takerResponse = apply_isolated_margin(
                perpetual.checks,
                table::borrow_mut(&mut perpetual.positions, takerAddress), 
                takerOrder, 
                fillQuantity, 
                fillPrice, 
                library::base_mul(fillPrice, perpetual.takerFee),
                1);


            let newMakerPosition = *table::borrow(&mut perpetual.positions, makerAddress);
            let newTakerPosition = *table::borrow(&mut perpetual.positions, takerAddress);
                                   
            // verify collateralization of maker and take
            verify_collat_checks(
                initMakerPosition, 
                newMakerPosition, 
                perpetual.initialMarginRequired, 
                perpetual.maintenanceMarginRequired, 
                oraclePrice, 
                1, 
                0);

            verify_collat_checks(
                initTakerPosition, 
                newTakerPosition, 
                perpetual.initialMarginRequired, 
                perpetual.maintenanceMarginRequired, 
                oraclePrice, 
                1, 
                1);

            emit (AccountPositionUpdateEvent{
                perpID, 
                account: makerAddress,
                position: newMakerPosition,
                action: 0
            });

            emit (AccountPositionUpdateEvent{
                perpID, 
                account: takerAddress,
                position: newTakerPosition,
                action: 0
            });

            emit(TradeExecutedEvent{
                perpID,
                tradeType: 1,
                maker: makerAddress,
                taker: takerAddress,
                makerOrderHash: makerHash,
                takerOrderHash: takerHash,
                makerMRO: position::mro(newMakerPosition),
                takerMRO: position::mro(newTakerPosition),
                makerFee: library::base_mul(makerResponse.feePerUnit, fillQuantity),
                takerFee: library::base_mul(takerResponse.feePerUnit, fillQuantity),
                makerPnl: makerResponse.pnlPerUnit,
                takerPnl: takerResponse.pnlPerUnit,
                tradeQuantity: fillQuantity,
                tradePrice: fillPrice,
                isBuy: takerIsBuy,
            });
    }


    /**
     * Allows caller to add margin to their position
     */
    public entry fun add_margin(perpetual: &mut Perpetual, amount: u128, ctx: &mut TxContext){
        assert!(amount > 0, error::margin_amount_must_be_greater_than_zero());
        let user = tx_context::sender(ctx);

        assert!(table::contains(&mut perpetual.positions, user), error::user_has_no_position_in_table());

        let balance = table::borrow_mut(&mut perpetual.positions, user);

        let qPos = position::qPos(*balance);
        let margin = position::margin(*balance);

        assert!(qPos > 0, error::user_position_size_is_zero());

        // TODO transfer margin amount from user to perpetual in margin bank

        // update margin of user in storage
        position::set_margin(balance, margin + amount);

        // TODO: apply funding rate
        // user must add enough margin that can pay for its all settlement dues

        emit (AccountPositionUpdateEvent{
                perpID: object::uid_to_inner(&perpetual.id), 
                account: user,
                // TODO confirm if balance being emitted has updated margin
                position: *balance,
                action: 1 // ADD_MARGIN
            });

    }

    /**
     * Allows caller to remove margin from their position
     */
    public entry fun remove_margin(perpetual: &mut Perpetual, amount: u128, ctx: &mut TxContext){
        assert!(amount > 0, error::margin_amount_must_be_greater_than_zero());

        let user = tx_context::sender(ctx);
        let oraclePrice = price_oracle::price(perpetual.oraclePrice);

        assert!(table::contains(&mut perpetual.positions, user), error::user_has_no_position_in_table());

        let initBalance = *table::borrow(&mut perpetual.positions, user);
        let balance = table::borrow_mut(&mut perpetual.positions, user);

        let qPos = position::qPos(*balance);
        let margin = position::margin(*balance);

        assert!(qPos > 0, error::user_position_size_is_zero());


        let maxRemovableAmount = margin_math::get_max_removeable_margin(*balance, oraclePrice);

        assert!(amount <= maxRemovableAmount, error::margin_must_be_less_than_max_removable_margin());
        
        // TODO transfer margin amount from perpetual to user address in margin bank

        // update margin of user in storage
        position::set_margin(balance, margin - amount);

        // TODO: apply funding rate

        let currBalance = *table::borrow(&mut perpetual.positions, user);

        verify_collat_checks(
            initBalance, 
            currBalance, 
            perpetual.initialMarginRequired, 
            perpetual.maintenanceMarginRequired, 
            oraclePrice, 
            0, 
            0);

        emit (AccountPositionUpdateEvent{
                perpID: object::uid_to_inner(&perpetual.id), 
                account: user,
                position: currBalance,
                action: 2 // REMOVE_MARGIN
            });

    }


    /**
     * Allows caller to adjust their leverage
     */
    public entry fun adjust_leverage(perpetual: &mut Perpetual, leverage: u128, ctx: &mut TxContext){

        // get precise(whole number) leverage 1, 2, 3...n
        leverage = get_precise_leverage(leverage);

        assert!(leverage > 0, error::leverage_can_not_be_set_to_zero());

        let user = tx_context::sender(ctx);
        let oraclePrice = price_oracle::price(perpetual.oraclePrice);

        assert!(table::contains(&mut perpetual.positions, user), error::user_has_no_position_in_table());

        // TODO: apply funding rate and get updated position Balance
        // initBalance will be returned by funding rate method
        let initBalance = *table::borrow(&mut perpetual.positions, user);

        let balance = table::borrow_mut(&mut perpetual.positions, user);
        let margin = position::margin(*balance);

        let targetMargin = margin_math::get_target_margin(*balance, leverage, oraclePrice);

        if(margin > targetMargin){
            // TODO: if user position has more margin than required for leverage, 
            // move extra margin back to bank
        } else if (margin < targetMargin) {
            // TODO: if user position has < margin than required target margin, 
            // move required margin from bank to perpetual
        };

        // update mro to target leverage
        position::set_mro(balance, library::base_div(library::base_uint(), leverage));

        // update margin to be target margin
        position::set_margin(balance, targetMargin);

        // verify oi open
        evaluator::verify_oi_open_for_account(
            perpetual.checks, 
            position::mro(*balance), 
            position::oiOpen(*balance), 
            0
        );

        let currBalance = *table::borrow(&mut perpetual.positions, user);

        verify_collat_checks(
            initBalance,
            currBalance,
            perpetual.initialMarginRequired, 
            perpetual.maintenanceMarginRequired, 
            oraclePrice, 
            0, 
            0);

        emit (AccountPositionUpdateEvent{
                perpID: object::uid_to_inner(&perpetual.id), 
                account: user,
                position: currBalance,
                action: 3 // ADJUST_LEVERAGE
            });
    }

    //===========================================================//
    //                      HELPER METHODS
    //===========================================================//

    fun apply_isolated_margin(checks:TradeChecks, balance: &mut UserPosition, order:Order, fillQuantity: u128, fillPrice: u128, feePerUnit: u128, isTaker: u64): IMResponse {
        
        let marginPerUnit;
        let fundsFlow;
        let pnlPerUnit = signed_number::new();
        let equityPerUnit;

        let isBuy = order::isBuy(order);
        let isReduceOnly = order::reduceOnly(order);
        
        let oiOpen = position::oiOpen(*balance);
        let qPos = position::qPos(*balance);
        let isPosPositive = position::isPosPositive(*balance);
        let margin = position::margin(*balance);
        let mro = library::base_div(library::base_uint(), order::leverage(order));

        let pPos = if ( qPos == 0 ) { 0 } else { library::base_div(oiOpen, qPos) }; 

        // case 1: Opening position or adding to position size
        if (qPos == 0 || isBuy == isPosPositive) {
            marginPerUnit = signed_number::from(library::base_mul(fillPrice, mro), true);
            fundsFlow = signed_number::from(library::base_mul(fillQuantity, signed_number::value(marginPerUnit) + feePerUnit), true);
            let updatedOiOpen = oiOpen + library::base_mul(fillQuantity, fillPrice);

            position::set_oiOpen(balance, updatedOiOpen);
            position::set_qPos(balance, qPos + fillQuantity);
            position::set_margin(balance, margin + library::base_mul(library::base_mul(fillQuantity, fillPrice), mro));
            position::set_isPosPositive(balance, isBuy);

            // verify that oi open checks still hold                       
            evaluator::verify_oi_open_for_account(
                checks, 
                mro,
                updatedOiOpen,
                isTaker
            );

        } 
        // case 2: Reduce only order
        else if (isReduceOnly || ( isBuy != isPosPositive && fillQuantity <= qPos)){
            let newQPos = qPos - fillQuantity;
            marginPerUnit = signed_number::from(library::base_div(margin, qPos), true);

            pnlPerUnit = if ( isPosPositive ) { 
                signed_number::from_subtraction(fillPrice, pPos) 
                } else { 
                signed_number::from_subtraction(pPos, fillPrice) 
                };

            equityPerUnit = signed_number::add(marginPerUnit, copy pnlPerUnit);
            
            assert!(signed_number::gte_uint(equityPerUnit, 0), error::loss_exceeds_margin(isTaker));
            
            // Max(0, equityPerUnit);
            let posValue = signed_number::positive_value(equityPerUnit);
            
            feePerUnit = if ( feePerUnit > posValue ) { posValue } else { feePerUnit };

            fundsFlow = signed_number::sub_uint( 
                signed_number::mul_uint(
                    signed_number::add_uint(
                        signed_number::negate(pnlPerUnit), 
                        feePerUnit), 
                    fillQuantity),
                (margin * fillQuantity) / qPos);


            fundsFlow = signed_number::positive_number(fundsFlow);
            pnlPerUnit = signed_number::mul_uint(pnlPerUnit, fillQuantity);
            
            position::set_margin(balance, (margin*newQPos) / qPos);
            position::set_qPos(balance, newQPos);
            position::set_oiOpen(balance, (oiOpen * newQPos) / qPos);
            // even if new position size is zero we are setting isPosPositive to false
            // this is what default value for isPosPositive is
            if(newQPos == 0){
                position::set_isPosPositive(balance, false);
            };


        } 
        // case 3: flipping position side
        else {
            
            let newQPos = fillQuantity - qPos;
            let updatedOIOpen = library::base_mul(newQPos, fillPrice);

            marginPerUnit = signed_number::from(library::base_div(margin, qPos), true);

            pnlPerUnit = if ( isPosPositive ) { 
                signed_number::from_subtraction(fillPrice, pPos) 
            } else { 
                signed_number::from_subtraction(pPos, fillPrice) 
            };

            equityPerUnit = signed_number::add(marginPerUnit, copy pnlPerUnit);


            assert!(signed_number::gte_uint(equityPerUnit, 0), error::loss_exceeds_margin(isTaker));

            // Max(0, equityPerUnit);
            let posValue = signed_number::positive_value(equityPerUnit);

            // fee paid on closing the current position            
            let closingFeePerUnit = if ( feePerUnit > posValue ) { posValue } else { feePerUnit };
            

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
                                    fillPrice, 
                                    mro) 
                                + feePerUnit)
                        );

            feePerUnit = library::base_mul(qPos, closingFeePerUnit) 
                         + ((newQPos * feePerUnit) / fillQuantity);



            pnlPerUnit = signed_number::mul_uint(pnlPerUnit, qPos);

            // verify that oi open checks still hold                       
            evaluator::verify_oi_open_for_account(
                checks, 
                mro,
                updatedOIOpen,
                isTaker
            );

            position::set_qPos(balance, newQPos);
            position::set_oiOpen(balance, updatedOIOpen);
            position::set_margin(balance, library::base_mul(updatedOIOpen, mro));
            position::set_isPosPositive(balance, !isPosPositive);

        };

        //  if position is closed due to reducing trade reset mro to zero
        if (position::qPos(*balance) == 0) {
            position::set_mro(balance, 0);
        } else {
        // update user mro as per order
            position::set_mro(balance, mro);
        };

        return IMResponse {
            fundsFlow,
            pnlPerUnit,
            feePerUnit
        }

    }

    fun verify_order(perpetual: &mut Perpetual, ordersTable: &mut Table<vector<u8>, OrderStatus>, order: Order, hash: vector<u8>, signature: vector<u8>, fillQuantity: u128, fillPrice: u128, isTaker: u64){

            verify_order_state(ordersTable, hash, isTaker);

            verify_order_signature(order, hash, signature, isTaker);

            verify_order_expiry(order, isTaker);

            let oraclePrice = price_oracle::price(perpetual.oraclePrice);

            verify_order_fills(perpetual, order, fillQuantity, fillPrice, oraclePrice, isTaker);

            verify_order_leverage(perpetual, order, isTaker);

            verify_and_fill_order_qty(ordersTable, order, hash, fillQuantity, isTaker);
    }

    fun create_position(perpID:ID, positions: &mut Table<address, UserPosition>, addr: address){
        
        if(!table::contains(positions, addr)){
            table::add(positions, addr, position::initPosition(perpID, addr));
        };

    }   

    fun create_order(ordersTable: &mut Table<vector<u8>, OrderStatus>, hash: vector<u8>){
        // if the order does not already exists on-chain
        if (!table::contains(ordersTable, hash)){
            table::add(ordersTable, hash, OrderStatus {status:true, filledQty: 0});
        };

    }

    fun verify_order_state(ordersTable: &mut Table<vector<u8>, OrderStatus>, hash:vector<u8>, isTaker:u64){
        
        let orderStatus = table::borrow(ordersTable, hash);
        assert!(orderStatus.status != false, error::order_has_invalid_signature(isTaker));

    }


    fun verify_and_fill_order_qty(ordersTable: &mut Table<vector<u8>, OrderStatus>, order:Order, orderHash:vector<u8>, fill:u128, isTaker:u64){
        
        let orderStatus = table::borrow_mut(ordersTable, orderHash);
        orderStatus.filledQty = orderStatus.filledQty + fill;

        assert!(orderStatus.filledQty  <=  order::quantity(order),  error::cannot_overfill_order(isTaker));

        emit(OrderFillEvent{
                orderHash,
                order,
                fill,
                newFilledQty: orderStatus.filledQty
            });
    }


    fun verify_order_signature(order:Order, hash:vector<u8>, signature:vector<u8>, isTaker:u64){

        let publicKey = ecdsa_k1::ecrecover(&signature, &hash);

        let publicAddress = library::get_public_address(publicKey);

        assert!(order::maker(order)== publicAddress, error::order_has_invalid_signature(isTaker));
    }

    fun verify_order_expiry(order:Order, isTaker:u64){
        // TODO compare with chain time
        assert!(order::expiration(order) == 0 || order::expiration(order) > 1, error::order_has_expired(isTaker));
    }

    fun verify_order_fills(perpetual: &mut Perpetual, order:Order, fillQuantity: u128, fillPrice: u128, oraclePrice: u128, isTaker:u64){
        let isBuyOrder = order::isBuy(order);
        let isReduceOnly = order::reduceOnly(order);
        let price = order::price(order);
        let triggerPrice = order::triggerPrice(order);

        // Ensure order is being filled at the specified or better price
        // For long/buy orders, the fill price must be equal or lower
        // For short/sell orders, the fill price must be equal or higher
        let validPrice = if (isBuyOrder) { fillPrice <= price } else {fillPrice >= price};

        assert!(validPrice, error::fill_price_invalid(isTaker));


        // When triggerPrice is specified (for stop orders), ensure the trigger condition has been met. Will be 0 for market & limit orders.
        if (triggerPrice != 0) {
            let validTriggerPrice =  if (isBuyOrder) { triggerPrice <= oraclePrice } else {triggerPrice >= oraclePrice};
            assert!(validTriggerPrice, error::trigger_price_not_reached(isTaker));
        };

        // For reduce only orders, ensure that the order would result in an
        // open position's size to reduce (fill amount <= open position size)

        let userPosition = *table::borrow(&mut perpetual.positions, order::maker(order));

        if(isReduceOnly){

            // Reduce only order must be in the opposite direction as open position 
            // (a positive position size means open position is Buy)
            // Reduce only order size must be less than open position size.
            // Size sign is stored separately (sizeIsPositive) so this is an absolute value comparison
            // regardless of position direction (Buy or Sell)
            assert!(isBuyOrder != position::isPosPositive(userPosition) && fillQuantity <= position::qPos(userPosition), error::fill_does_not_decrease_size(isTaker));        
        }

    }

    fun verify_order_leverage(perpetual: &mut Perpetual, order:Order, isTaker:u64){

        let leverage = order::leverage(order);
        let maker = order::maker(order);

        let userPosition = *table::borrow(&mut perpetual.positions, maker);
        let mro = position::mro(userPosition);

        assert!(leverage > 0, error::leverage_must_be_greater_than_zero(isTaker));
        
        assert!(mro == 0 || library::base_div(library::base_uint(), leverage) == mro, error::invalid_leverage(isTaker));


    }

    fun has_account_permission(operatorTable: &mut Table<address, bool>, taker:address, sender:address):bool{
        return taker == sender || table::contains(operatorTable, sender)
    }

    fun get_precise_leverage(leverage:u128): u128 {
        return (leverage / library::base_uint()) * library::base_uint()
    }

    fun verify_collat_checks(initialPosition: UserPosition, currentPosition: UserPosition, imr: u128, mmr: u128, oraclePrice:u128, tradeType: u64, isTaker:u64){

            let initMarginRatio = position::margin_ratio(initialPosition, oraclePrice);
            let currentMarginRatio = position::margin_ratio(currentPosition, oraclePrice);

            // Case 0: Current Margin Ratio >= IMR: User can increase and reduce positions.
            if (signed_number::gte_uint(currentMarginRatio, imr)) {
                return
            };

            // Case I: For MR < IMR: If flipping or new trade, current ratio can only be >= IMR
            assert!(
                position::isPosPositive(currentPosition) == position::isPosPositive(initialPosition)
                && 
                position::qPos(initialPosition) > 0,
                error::mr_less_than_imr_can_not_open_or_flip_position(isTaker)
            );

            // Case II: For MR < IMR: require MR to have improved or stayed the same
            assert!(
                signed_number::gte(currentMarginRatio, initMarginRatio), 
                error::mr_less_than_imr_mr_must_improve(isTaker)
                );

            // Case III: For MR <= MMR require qPos to go down or stay the same
            assert!(
                signed_number::gte_uint(currentMarginRatio, mmr)
                ||
                (
                    position::qPos(initialPosition) >= position::qPos(currentPosition)
                    &&
                    position::isPosPositive(initialPosition) == position::isPosPositive(currentPosition)
                ),
                error::mr_less_than_imr_position_can_only_reduce(isTaker)
            );

            // Case IV: For MR < 0 require that its a liquidation
            // @dev A normal trade type is 1
            // @dev A liquidation trade type is 2
            // @dev A deleveraging trade type is 3
            assert!(
                signed_number::gte_uint(currentMarginRatio, 0)
                || 
                tradeType == 2 || tradeType == 3,
                error::mr_less_than_zero(isTaker)
                );
    }


    /*
     * Sets OraclePrice  
     */
    public entry fun set_oracle_price(perp: &mut Perpetual, cap: &UpdateOraclePriceCapability, price: u128, ctx: &mut TxContext){
        price_oracle::set_oracle_price(object::uid_to_inner(&perp.id), cap, &mut perp.oraclePrice, price, tx_context::sender(ctx));
    }

    /*
     * Sets Max difference allowed in percentage between New Oracle Price & Old Oracle Price
     */
    public entry fun set_oracle_price_max_allowed_diff(_: &AdminCap, perp: &mut Perpetual, maxAllowedPriceDifference: u128){
        price_oracle::set_oracle_price_max_allowed_diff(object::uid_to_inner(&perp.id), &mut perp.oraclePrice, maxAllowedPriceDifference);
    }

    /*
     * Sets operator address who is allowed to update oracle price 
     */
    public entry fun set_price_oracle_operator(_: &AdminCap, cap: &mut UpdateOraclePriceCapability, perp: &Perpetual, operator: address){
       price_oracle::set_price_oracle_operator(object::uid_to_inner(&perp.id), cap, operator);
    }
}

