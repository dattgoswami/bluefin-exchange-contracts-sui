
module bluefin_foundation::exchange {

    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::event::{emit};
    use sui::table::{Self, Table};
    use sui::ecdsa_k1;
    use sui::transfer;

    // custom modules
    use bluefin_foundation::position::{Self, UserPosition};
    use bluefin_foundation::price_oracle::{Self, UpdateOraclePriceCapability};
    use bluefin_foundation::evaluator::{Self, TradeChecks};
    use bluefin_foundation::perpetual::{Self, Perpetual};
    use bluefin_foundation::order::{Self, Order};
    use bluefin_foundation::library::{Self};
    use bluefin_foundation::signed_number::{Self, Number};
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::margin_math::{Self};

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

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

    //===========================================================//
    //                           STORAGE                         //
    //===========================================================//
    

    struct AdminCap has key {
        id: UID,
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

        let checks = evaluator::initialize(
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

        
        let oraclePrice = price_oracle::initialize(
            0, 
            maxAllowedPriceDiffInOP,
            0, 
            perpID, 
            tx_context::sender(ctx), 
            ctx
        );

        // creates perpetual and shares it
        perpetual::initialize(
            id,
            name,
            checks,
            initialMarginRequired,
            maintenanceMarginRequired,
            makerFee,
            takerFee,
            positions,
            oraclePrice
        );

    }

    /**
     * Updates minimum price of the perpetual 
     * Only Admin can update price
     */
    public entry fun set_min_price( _: &AdminCap, perp: &mut Perpetual, minPrice: u128){
        evaluator::set_min_price(
            object::uid_to_inner(perpetual::id(perp)), 
            perpetual::mut_checks(perp), 
            minPrice);
    }   

    /** Updates maximum price of the perpetual 
     * Only Admin can update price
     */
    public entry fun set_max_price( _: &AdminCap, perp: &mut Perpetual, maxPrice: u128){
        evaluator::set_max_price(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), maxPrice);
    }   

    /**
     * Updates step size of the perpetual 
     * Only Admin can update size
     */
    public entry fun set_step_size( _: &AdminCap, perp: &mut Perpetual, stepSize: u128){
        evaluator::set_step_size(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), stepSize);
    }   

    /**
     * Updates tick size of the perpetual 
     * Only Admin can update size
     */
    public entry fun set_tick_size( _: &AdminCap, perp: &mut Perpetual, tickSize: u128){
        evaluator::set_tick_size(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), tickSize);
    }   

    /**
     * Updates market take bound (long) of the perpetual 
     * Only Admin can update MTB long
     */
    public entry fun set_mtb_long( _: &AdminCap, perp: &mut Perpetual, mtbLong: u128){
        evaluator::set_mtb_long(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), mtbLong);
    }  

    /**
     * Updates market take bound (short) of the perpetual 
     * Only Admin can update MTB short
     */
    public entry fun set_mtb_short( _: &AdminCap, perp: &mut Perpetual, mtbShort: u128){
        evaluator::set_mtb_short(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), mtbShort);
    }   

    /**
     * Updates maximum quantity for limit orders of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun set_max_qty_limit( _: &AdminCap, perp: &mut Perpetual, quantity: u128){
        evaluator::set_max_qty_limit(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), quantity);
    }   

    /**
     * Updates maximum quantity for market orders of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun set_max_qty_market( _: &AdminCap, perp: &mut Perpetual, quantity: u128){
        evaluator::set_max_qty_market(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), quantity);
    }  

    /**
     * Updates minimum quantity of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun set_min_qty( _: &AdminCap, perp: &mut Perpetual, quantity: u128){
        evaluator::set_min_qty(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), quantity);
    }   

    /**
     * updates max allowed oi open for selected mro
     * Only Admin can update max allowed OI open
     */
    public entry fun set_max_oi_open( _: &AdminCap, perp: &mut Perpetual, maxLimit: vector<u128>){
        evaluator::set_max_oi_open(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), maxLimit);
    }

    /*
     * Sets OraclePrice  
     */
    public entry fun set_oracle_price(perp: &mut Perpetual, cap: &UpdateOraclePriceCapability, price: u128, ctx: &mut TxContext){
        price_oracle::set_oracle_price(
            object::uid_to_inner(perpetual::id(perp)), 
            cap, 
            perpetual::mut_oraclePrice(perp),
            price, 
            tx_context::sender(ctx));
    }

    /*
     * Sets Max difference allowed in percentage between New Oracle Price & Old Oracle Price
     */
    public entry fun set_oracle_price_max_allowed_diff(_: &AdminCap, perp: &mut Perpetual, maxAllowedPriceDifference: u128){
        price_oracle::set_oracle_price_max_allowed_diff(
            object::uid_to_inner(perpetual::id(perp)),
            perpetual::mut_oraclePrice(perp),
            maxAllowedPriceDifference);
    }

    /*
     * Sets operator address who is allowed to update oracle price 
     */
    public entry fun set_price_oracle_operator(_: &AdminCap, cap: &mut UpdateOraclePriceCapability, perp: &Perpetual, operator: address){
       price_oracle::set_price_oracle_operator(
        object::uid_to_inner(perpetual::id(perp)),
        cap,
        operator);
    }

    /**
     * Used to perofrm on-chain trade between two orders (maker/taker)
     */ 
    public entry fun trade(
        perp: &mut Perpetual, 
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

            let perpID = object::uid_to_inner(perpetual::id(perp));
            let sender = tx_context::sender(ctx);

            let oraclePrice = price_oracle::price(perpetual::oraclePrice(perp));

            // check if caller has permission to trade on taker's behalf
            assert!(has_account_permission(operatorTable, takerAddress, sender), error::sender_has_no_taker_permission());

            assert!(makerIsBuy != takerIsBuy, error::order_cannot_be_of_same_side());

            let makerFee = perpetual::makerFee(perp);
            let takerFee = perpetual::takerFee(perp);
            
            // if maker/taker positions don't exist create them
            position::create_position(perpID, perpetual::positions(perp), makerAddress);
            position::create_position(perpID, perpetual::positions(perp), takerAddress);

            // TODO check if trading is allowed by guardian for given perpetual or not

            // TODO check if trading is started or not

            // TODO apply funding rate

            let makerOrder = order::initialize(makerTriggerPrice, makerIsBuy, makerPrice, makerQuantity, makerLeverage, makerReduceOnly, makerAddress, makerExpiration, makerSalt);
            let takerOrder = order::initialize(takerTriggerPrice, takerIsBuy, takerPrice, takerQuantity, takerLeverage, takerReduceOnly, takerAddress, takerExpiration, takerSalt);

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
            order::set_leverage(&mut makerOrder, library::round_down(makerLeverage));
            order::set_leverage(&mut takerOrder, library::round_down(takerLeverage));

            // Validate orders are correct and can be executed for the trade
            verify_order(perp, ordersTable, makerOrder, makerHash, makerSignature, fillQuantity, fillPrice, 0);
            verify_order(perp, ordersTable, takerOrder, takerHash, takerSignature, fillQuantity, fillPrice, 1);

            // verify pre-trade checks
            evaluator::verify_price_checks(perpetual::checks(perp), fillPrice);
            evaluator::verify_qty_checks(perpetual::checks(perp), fillQuantity);
            evaluator::verify_market_take_bound_checks(perpetual::checks(perp), fillPrice, oraclePrice, takerIsBuy);

            let initMakerPosition = *table::borrow(perpetual::positions(perp), makerAddress);
            let initTakerPosition = *table::borrow(perpetual::positions(perp), takerAddress);

            // apply isolated margin
            let makerResponse = apply_isolated_margin(
                perpetual::checks(perp),
                table::borrow_mut(perpetual::positions(perp), makerAddress), 
                makerOrder, 
                fillQuantity, 
                fillPrice, 
                library::base_mul(fillPrice, makerFee),
                0);

            let takerResponse = apply_isolated_margin(
                perpetual::checks(perp),
                table::borrow_mut(perpetual::positions(perp), takerAddress), 
                takerOrder, 
                fillQuantity, 
                fillPrice, 
                library::base_mul(fillPrice, takerFee),
                1);


            let newMakerPosition = *table::borrow(perpetual::positions(perp), makerAddress);
            let newTakerPosition = *table::borrow(perpetual::positions(perp), takerAddress);
                                   
            // verify collateralization of maker and take
            verify_collat_checks(
                initMakerPosition, 
                newMakerPosition, 
                perpetual::imr(perp), 
                perpetual::mmr(perp), 
                oraclePrice, 
                1, 
                0);

            verify_collat_checks(
                initTakerPosition, 
                newTakerPosition, 
                perpetual::imr(perp), 
                perpetual::mmr(perp), 
                oraclePrice, 
                1, 
                1);

            position::emit_position_update_event(perpID, makerAddress, newMakerPosition, 0);
            position::emit_position_update_event(perpID, takerAddress, newTakerPosition, 0);

    
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
    public entry fun add_margin(perp: &mut Perpetual, amount: u128, ctx: &mut TxContext){
        assert!(amount > 0, error::margin_amount_must_be_greater_than_zero());
        let user = tx_context::sender(ctx);

        assert!(table::contains(perpetual::positions(perp), user), error::user_has_no_position_in_table());

        let perpID = object::uid_to_inner(perpetual::id(perp));

        let balance = table::borrow_mut(perpetual::positions(perp), user);

        let qPos = position::qPos(*balance);
        let margin = position::margin(*balance);

        assert!(qPos > 0, error::user_position_size_is_zero());

        // TODO transfer margin amount from user to perpetual in margin bank

        // update margin of user in storage
        position::set_margin(balance, margin + amount);

        // TODO: apply funding rate
        // user must add enough margin that can pay for its all settlement dues
        
        position::emit_position_update_event(perpID, user, *balance, 1);


    }

    /**
     * Allows caller to remove margin from their position
     */
    public entry fun remove_margin(perp: &mut Perpetual, amount: u128, ctx: &mut TxContext){
        assert!(amount > 0, error::margin_amount_must_be_greater_than_zero());

        let user = tx_context::sender(ctx);
        let oraclePrice = price_oracle::price(perpetual::oraclePrice(perp));

        assert!(table::contains(perpetual::positions(perp), user), error::user_has_no_position_in_table());

        let perpID = object::uid_to_inner(perpetual::id(perp));

        let initBalance = *table::borrow(perpetual::positions(perp), user);
        let balance = table::borrow_mut(perpetual::positions(perp), user);

        let qPos = position::qPos(*balance);
        let margin = position::margin(*balance);

        assert!(qPos > 0, error::user_position_size_is_zero());


        let maxRemovableAmount = margin_math::get_max_removeable_margin(*balance, oraclePrice);

        assert!(amount <= maxRemovableAmount, error::margin_must_be_less_than_max_removable_margin());
        
        // TODO transfer margin amount from perpetual to user address in margin bank

        // update margin of user in storage
        position::set_margin(balance, margin - amount);

        // TODO: apply funding rate

        let currBalance = *table::borrow(perpetual::positions(perp), user);

        verify_collat_checks(
            initBalance, 
            currBalance, 
            perpetual::imr(perp), 
            perpetual::mmr(perp), 
            oraclePrice, 
            0, 
            0);
            
        position::emit_position_update_event(perpID, user, currBalance, 2);

    }


    /**
     * Allows caller to adjust their leverage
     */
    public entry fun adjust_leverage(perp: &mut Perpetual, leverage: u128, ctx: &mut TxContext){

        // get precise(whole number) leverage 1, 2, 3...n
        leverage = library::round_down(leverage);

        assert!(leverage > 0, error::leverage_can_not_be_set_to_zero());

        let user = tx_context::sender(ctx);
        let oraclePrice = price_oracle::price(perpetual::oraclePrice(perp));
        let tradeChecks = perpetual::checks(perp);
        let perpID = object::uid_to_inner(perpetual::id(perp));

        assert!(table::contains(perpetual::positions(perp), user), error::user_has_no_position_in_table());

        // TODO: apply funding rate and get updated position Balance
        // initBalance will be returned by funding rate method
        let initBalance = *table::borrow(perpetual::positions(perp), user);

        let balance = table::borrow_mut(perpetual::positions(perp), user);
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
            tradeChecks, 
            position::mro(*balance), 
            position::oiOpen(*balance), 
            0
        );

        let currBalance = *table::borrow(perpetual::positions(perp), user);

        verify_collat_checks(
            initBalance,
            currBalance,
            perpetual::imr(perp), 
            perpetual::mmr(perp), 
            oraclePrice, 
            0, 
            0);

        position::emit_position_update_event(perpID, user, currBalance, 3);
    }

    // //===========================================================//
    // //                      HELPER METHODS
    // //===========================================================//

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

    fun verify_order(perp: &mut Perpetual, ordersTable: &mut Table<vector<u8>, OrderStatus>, order: Order, hash: vector<u8>, signature: vector<u8>, fillQuantity: u128, fillPrice: u128, isTaker: u64){

            verify_order_state(ordersTable, hash, isTaker);

            verify_order_signature(order, hash, signature, isTaker);

            verify_order_expiry(order, isTaker);

            let oraclePrice = price_oracle::price(perpetual::oraclePrice(perp));

            verify_order_fills(perp, order, fillQuantity, fillPrice, oraclePrice, isTaker);

            verify_order_leverage(perp, order, isTaker);

            verify_and_fill_order_qty(ordersTable, order, hash, fillQuantity, isTaker);
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

    fun verify_order_fills(perp: &mut Perpetual, order:Order, fillQuantity: u128, fillPrice: u128, oraclePrice: u128, isTaker:u64){
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

        let userPosition = *table::borrow(perpetual::positions(perp), order::maker(order));

        if(isReduceOnly){

            // Reduce only order must be in the opposite direction as open position 
            // (a positive position size means open position is Buy)
            // Reduce only order size must be less than open position size.
            // Size sign is stored separately (sizeIsPositive) so this is an absolute value comparison
            // regardless of position direction (Buy or Sell)
            assert!(isBuyOrder != position::isPosPositive(userPosition) && fillQuantity <= position::qPos(userPosition), error::fill_does_not_decrease_size(isTaker));        
        }

    }

    fun verify_order_leverage(perp: &mut Perpetual, order:Order, isTaker:u64){

        let leverage = order::leverage(order);
        let maker = order::maker(order);

        let userPosition = *table::borrow(perpetual::positions(perp), maker);
        let mro = position::mro(userPosition);

        assert!(leverage > 0, error::leverage_must_be_greater_than_zero(isTaker));
        
        assert!(mro == 0 || library::base_div(library::base_uint(), leverage) == mro, error::invalid_leverage(isTaker));


    }

    fun has_account_permission(operatorTable: &mut Table<address, bool>, taker:address, sender:address):bool{
        return taker == sender || table::contains(operatorTable, sender)
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
}
