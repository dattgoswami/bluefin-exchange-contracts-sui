
module firefly_exchange::perpetual {

    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};
    use std::string::{Self, String};
    use sui::transfer;
    use sui::event::{emit};
    use sui::table::{Self, Table};
    use sui::ecdsa;

    // custom modules
    use firefly_exchange::position::{Self, UserPosition};
    use firefly_exchange::evaluator::{Self, TradeChecks};
    use firefly_exchange::order::{Self, Order};
    use firefly_exchange::library::{Self};
    use firefly_exchange::signed_number::{Self, Number};
    use firefly_exchange::error::{Self};

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct DebugEvent has copy, drop {
        orderAddress: address,
        extractedAddress: vector<u8>
    }

    struct DebugOrder has copy, drop {
        order: Order
    }

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
        account:address,
        position:UserPosition,
        action: u64
    }

    struct TradeExecutedEvent has copy, drop {
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
    public entry fun setSettlementOperator(_:&AdminCap, operatorTable: &mut Table<address, bool>, operator:address, status:bool){
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

        let perpetual = Perpetual {
            id: id,
            name: string::utf8(name),
            checks,
            initialMarginRequired,
            maintenanceMarginRequired,
            makerFee,
            takerFee,
            positions,
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
    public entry fun setMinPrice( _: &AdminCap, perpetual: &mut Perpetual, minPrice: u128){
        evaluator::setMinPrice(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, minPrice);
    }   

    /** Updates maximum price of the perpetual 
     * Only Admin can update price
     */
    public entry fun setMaxPrice( _: &AdminCap, perpetual: &mut Perpetual, maxPrice: u128){
        evaluator::setMaxPrice(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, maxPrice);
    }   

    /**
     * Updates step size of the perpetual 
     * Only Admin can update size
     */
    public entry fun setStepSize( _: &AdminCap, perpetual: &mut Perpetual, stepSize: u128){
        evaluator::setStepSize(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, stepSize);
    }   

    /**
     * Updates tick size of the perpetual 
     * Only Admin can update size
     */
    public entry fun setTickSize( _: &AdminCap, perpetual: &mut Perpetual, tickSize: u128){
        evaluator::setTickSize(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, tickSize);
    }   

    /**
     * Updates market take bound (long) of the perpetual 
     * Only Admin can update MTB long
     */
    public entry fun setMtbLong( _: &AdminCap, perpetual: &mut Perpetual, mtbLong: u128){
        evaluator::setMtbLong(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, mtbLong);
    }  

    /**
     * Updates market take bound (short) of the perpetual 
     * Only Admin can update MTB short
     */
    public entry fun setMtbShort( _: &AdminCap, perpetual: &mut Perpetual, mtbShort: u128){
        evaluator::setMtbShort(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, mtbShort);
    }   

    /**
     * Updates maximum quantity for limit orders of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun setMaxQtyLimit( _: &AdminCap, perpetual: &mut Perpetual, quantity: u128){
        evaluator::setMaxQtyLimit(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, quantity);
    }   

    /**
     * Updates maximum quantity for market orders of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun setMaxQtyMarket( _: &AdminCap, perpetual: &mut Perpetual, quantity: u128){
        evaluator::setMaxQtyMarket(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, quantity);
    }  

    /**
     * Updates minimum quantity of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun setMinQty( _: &AdminCap, perpetual: &mut Perpetual, quantity: u128){
        evaluator::setMinQty(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, quantity);
    }   

    /**
     * updates max allowed oi open for selected mro
     * Only Admin can update max allowed OI open
     */
    public entry fun setMaxOIOpen( _: &AdminCap, perpetual: &mut Perpetual, maxLimit: vector<u128>){
        evaluator::setMaxOIOpen(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, maxLimit);
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

            // check if caller has permission to trade on taker's behalf
            assert!(has_account_permission(operatorTable, takerAddress, sender), error::sender_has_no_taker_permission());

            assert!(makerIsBuy != takerIsBuy, error::order_cannot_be_of_same_side());

            // if maker/taker positions don't exist create them
            create_position(perpetual, makerAddress);
            create_position(perpetual, takerAddress);

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

            // TODO verify pre-trade checks over here

            // apply isolated margin
            let _curMakerPosition = *table::borrow(&mut perpetual.positions, makerAddress);
            let _curTakerPosition = *table::borrow(&mut perpetual.positions, takerAddress);

            let makerResponse = apply_isolated_margin(
                table::borrow_mut(&mut perpetual.positions, makerAddress), 
                makerOrder, 
                fillQuantity, 
                fillPrice, 
                library::base_div(fillPrice, perpetual.makerFee),
                0);

            let takerResponse = apply_isolated_margin(
                table::borrow_mut(&mut perpetual.positions, takerAddress), 
                takerOrder, 
                fillQuantity, 
                fillPrice, 
                library::base_div(fillPrice, perpetual.takerFee),
                1);

            let newMakerPosition = *table::borrow(&mut perpetual.positions, makerAddress);
            let newTakerPosition = *table::borrow(&mut perpetual.positions, takerAddress);
            
            emit (AccountPositionUpdateEvent{
                account: makerAddress,
                position: newMakerPosition,
                action: 0
            });

            emit (AccountPositionUpdateEvent{
                account: takerAddress,
                position: newTakerPosition,
                action: 0
            });

            emit(TradeExecutedEvent{
                tradeType: 0,
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


    fun apply_isolated_margin(balance: &mut UserPosition, order:Order, fillQuantity: u128, fillPrice: u128, feePerUnit: u128, isTaker: u64): IMResponse {
        
        // update user mro
        position::set_mro(balance, library::base_div(library::base_uint(), order::leverage(order)));

        let marginPerUnit;
        let fundsFlow;
        let pnlPerUnit = signed_number::new();
        let equityPerUnit;

        let isBuy = order::isBuy(order);
        let isReduceOnly = order::reduceOnly(order);

        let oiOpen = position::oiOpen(*balance);
        let qPos = position::qPos(*balance);
        let isPosPositive = position::isPosPositive(*balance);
        let mro = position::mro(*balance);
        let margin = position::margin(*balance);

        let pPos = if ( oiOpen == 0 ) { 0 } else { library::base_div(oiOpen, qPos) }; 

        // case 1: Opening position or adding to position size
        if (qPos == 0 || isBuy == isPosPositive) {
            position::set_oiOpen(balance, oiOpen + library::base_mul(fillQuantity, fillPrice));
            position::set_qPos(balance, qPos + fillQuantity);
            marginPerUnit = signed_number::from(library::base_mul(fillPrice, mro), true);
            fundsFlow = signed_number::from(library::base_mul(fillQuantity, signed_number::value(marginPerUnit) + feePerUnit), true);
            position::set_margin(balance, margin + library::base_mul(library::base_mul(fillQuantity,fillPrice), mro));
            position::set_isPosPositive(balance, isBuy);

            // TODO verify oi open for account condition still holds
            // IEvaluator(evaluator).verifyOIOpenForAccount(order.maker, balance);
        } 
        // case 2: Reduce only order
        else if (isReduceOnly || ( isBuy != isPosPositive && fillQuantity <= qPos)){
            let newQPos = qPos - fillQuantity;
            position::set_qPos(balance, newQPos);
            position::set_oiOpen(balance, (oiOpen * newQPos) / qPos);

            marginPerUnit = signed_number::from(library::base_div(margin, qPos), true);

            pnlPerUnit = if ( isPosPositive ) { 
                signed_number::from_subtraction(fillPrice, pPos) 
                } else { 
                signed_number::from_subtraction(pPos, fillPrice) 
                };

            equityPerUnit = signed_number::add(marginPerUnit, copy pnlPerUnit);
            
            assert!(signed_number::gte(equityPerUnit, 0), error::loss_exceeds_margin(isTaker));
            
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

            position::set_margin(balance, (margin*newQPos) / qPos);


            // even if new position size is zero we are setting isPosPositive to false
            // this is what default value for isPosPositive is
            
            if(newQPos == 0){
                position::set_isPosPositive(balance, false);
            };

            pnlPerUnit = signed_number::mul_uint(pnlPerUnit, fillQuantity);

        } 
        // case 3: flipping position side
        else {
            
            let newQPos = fillQuantity - qPos;
            position::set_qPos(balance, newQPos);
            position::set_oiOpen(balance, library::base_mul(newQPos, fillPrice));

            marginPerUnit = signed_number::from(library::base_div(margin, qPos), true);

            pnlPerUnit = if ( isPosPositive ) { 
                signed_number::from_subtraction(fillPrice, pPos) 
            } else { 
                signed_number::from_subtraction(pPos, fillPrice) 
            };

            equityPerUnit = signed_number::add(marginPerUnit, copy pnlPerUnit);


            assert!(signed_number::gte(equityPerUnit, 0), error::loss_exceeds_margin(isTaker));

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
            position::set_isPosPositive(balance, !isPosPositive);

            feePerUnit = library::base_mul(qPos, closingFeePerUnit) 
                         + ((newQPos * feePerUnit) / fillQuantity);


            // TODO verify oi open for account condition still holds
            // IEvaluator(evaluator).verifyOIOpenForAccount(order.maker, balance);

            position::set_margin(balance, library::base_mul(oiOpen, mro));

            pnlPerUnit = signed_number::mul_uint(pnlPerUnit, qPos);

        };


        //  if position is closed due to reducing trade reset mro to zero
        if (position::qPos(*balance) == 0) {
            position::set_mro(balance, 0);
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

            // TODO, pass oracle price in 5th argument
            verify_order_fills(perpetual, order, fillQuantity, fillPrice, fillPrice, isTaker);


            verify_order_leverage(perpetual, order, isTaker);

            verify_and_fill_order_qty(ordersTable, order, hash, fillQuantity, isTaker);

    }

    //===========================================================//
    //                      HELPER METHODS
    //===========================================================//

    fun create_position(perpetual: &mut Perpetual, addr: address){

        let perpID = object::uid_to_inner(&perpetual.id);
        
        if(!table::contains(&mut perpetual.positions, addr)){
            table::add(&mut perpetual.positions, addr, position::initPosition(perpID, addr));
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

        let publicKey = ecdsa::ecrecover(&signature, &hash);

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
        return taker == sender || table::contains(operatorTable,sender)
    }

    fun get_precise_leverage(leverage:u128): u128 {
        return (leverage / library::base_uint()) * library::base_uint()
    }

}

