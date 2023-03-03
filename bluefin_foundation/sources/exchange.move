
module bluefin_foundation::exchange {

    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::event::{emit};
    use sui::table::{Self, Table};
    use sui::transfer;

    // custom modules
    use bluefin_foundation::position::{Self, UserPosition};
    use bluefin_foundation::price_oracle::{Self, UpdatePriceOracleCap};
    use bluefin_foundation::perpetual::{Self, Perpetual};
    use bluefin_foundation::margin_bank::{Self, Bank};
    use bluefin_foundation::evaluator::{Self};
    use bluefin_foundation::library::{Self};
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::margin_math::{Self};

    // traders
    use bluefin_foundation::isolated_trading::{Self, OrderStatus};
    use bluefin_foundation::isolated_liquidation::{Self};
    use bluefin_foundation::isolated_adl::{Self};

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct OperatorUpdateEvent has copy, drop {
        account:address,
        status: bool
    }
    
    //===========================================================//
    //                           STORAGE                         //
    //===========================================================//
    

    struct AdminCap has key {
        id: UID,
    }

    //===========================================================//
    //                      CONSTANTS
    //===========================================================//

    // action types
    const ACTION_ADD_MARGIN: u8 = 1;
    const ACTION_REMOVE_MARGIN: u8 = 2;
    const ACTION_ADJUST_LEVERAGE: u8 = 3;
    const ACTION_FINAL_WITHDRAWAL: u8 = 4;
     
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
        bank: &mut Bank,

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
        imr: u128,
        mmr: u128,
        makerFee: u128,
        takerFee: u128,
        maxAllowedFR: u128,
        maxAllowedPriceDiffInOP: u128,
        insurancePoolRatio: u128,
        insurancePool: address,
        feePool: address,
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

        
        let priceOracle = price_oracle::initialize(
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
            imr,
            mmr,
            makerFee,
            takerFee,
            maxAllowedFR,
            insurancePoolRatio,
            insurancePool,
            feePool,
            checks,
            positions,
            priceOracle
        );


        // create bank account for perpetual
        margin_bank::initialize_account(
            margin_bank::mut_accounts(bank), 
            object::id_to_address(&perpID),
            ctx
        );

        // create bank account for insurance pool of perpetual
        margin_bank::initialize_account(
            margin_bank::mut_accounts(bank), 
            insurancePool,
            ctx
        );


        // create bank account for fee pool of perpetual
        margin_bank::initialize_account(
            margin_bank::mut_accounts(bank), 
            feePool,
            ctx
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
     * Sets PriceOracle  
     */
    public entry fun set_oracle_price(perp: &mut Perpetual, cap: &UpdatePriceOracleCap, price: u128, ctx: &mut TxContext){
        price_oracle::set_oracle_price(
            object::uid_to_inner(perpetual::id(perp)), 
            cap, 
            perpetual::mut_priceOracle(perp),
            price, 
            tx_context::sender(ctx));
    }

    /*
     * Sets Max difference allowed in percentage between New Oracle Price & Old Oracle Price
     */
    public entry fun set_oracle_price_max_allowed_diff(_: &AdminCap, perp: &mut Perpetual, maxAllowedPriceDifference: u128){
        price_oracle::set_oracle_price_max_allowed_diff(
            object::uid_to_inner(perpetual::id(perp)),
            perpetual::mut_priceOracle(perp),
            maxAllowedPriceDifference);
    }

    /*
     * Sets operator address who is allowed to update oracle price 
     */
    public entry fun set_price_oracle_operator(_: &AdminCap, cap: &mut UpdatePriceOracleCap, perp: &Perpetual, operator: address){
       price_oracle::set_price_oracle_operator(
        object::uid_to_inner(perpetual::id(perp)),
        cap,
        operator);
    }


    //===========================================================//
    //                          TRADES                           //
    //===========================================================//

    /**
     * Used to perofrm on-chain trade between two orders (maker/taker)
     */ 
    public entry fun trade(
        perp: &mut Perpetual, 
        bank: &mut Bank, 
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
        quantity: u128, 
        price: u128,
        
        ctx: &mut TxContext        
        ){

            let sender = tx_context::sender(ctx);

            // check if caller is a valid settlement operator or not
            assert!(
                is_valid_settlement_operator(operatorTable, sender),
                error::invalid_settlement_operator());

            // TODO check if trading is allowed by guardian for given perpetual or not

            // TODO check if trading is started or not

            // TODO apply funding rate

            let data = isolated_trading::pack_trade_data(
                 // maker
                makerTriggerPrice, 
                makerIsBuy, 
                makerPrice, 
                makerQuantity, 
                makerLeverage, 
                makerReduceOnly, 
                makerAddress, 
                makerExpiration, 
                makerSalt, 
                makerSignature,
                // taker
                takerTriggerPrice, 
                takerIsBuy, 
                takerPrice, 
                takerQuantity, 
                takerLeverage, 
                takerReduceOnly, 
                takerAddress, 
                takerExpiration, 
                takerSalt, 
                takerSignature,

                // fill
                quantity,
                price
            );

            isolated_trading::trade(sender, perp, bank, ordersTable, data);
    }

    /**
     * Used to perofrm liquidation trade between the liquidator and
     * an under collat account
     */ 
    public entry fun liquidate(
        perp: &mut Perpetual,
        bank: &mut Bank, 

        // address of account to be liquidated
        liquidatee: address,
        // address of liquidator
        liquidator: address,
        // quantity to be liquidated
        quantity: u128,
        //liquidators leverage
        leverage: u128,
        // all of nothing
        allOrNothing: bool,

        ctx: &mut TxContext        

    ){

        let sender = tx_context::sender(ctx);

        // check if caller has permission to trade on taker's behalf
        // we can have sub accounts feature in future
        assert!(
            sender == liquidator,
            error::sender_does_not_have_permission_for_account(1));

        // TODO check if trading is allowed by guardian for given perpetual or not

        // TODO check if trading is started or not

        // TODO apply funding rate

        let data = isolated_liquidation::pack_trade_data(
            liquidator,
            liquidatee,
            quantity,
            leverage,
            allOrNothing);

        isolated_liquidation::trade(sender, perp, bank, data);
    }

    /**
     * Used to perofrm adl trade between an under water maker and 
     * above water taker
     */
     public entry fun deleverage(
        perp: &mut Perpetual, 
        bank: &mut Bank, 
        // below water account to be deleveraged
        maker: address,
        // taker in profit
        taker: address,        
        // quantity of trade
        quantity: u128,
        // if true, will revert if maker's position is less than the amount
        allOrNothing: bool,
        // sender's context
        ctx: &mut TxContext        
    ){

        let sender = tx_context::sender(ctx);

        // TODO only deleveraging operator can perform deleveraging trades

        // TODO check if trading is allowed by guardian for given perpetual or not

        // TODO check if trading is started or not

        // TODO apply funding rate

        let data = isolated_adl::pack_trade_data(
            maker,
            taker,
            quantity,
            allOrNothing);

        isolated_adl::trade(sender, perp, bank, data);
    }


    //===========================================================//
    //                       MARGIN ADJUSTMENT                   //
    //===========================================================//

    /**
     * Allows caller to add margin to their position
     */
    public entry fun add_margin(perp: &mut Perpetual, bank: &mut Bank, amount: u128, ctx: &mut TxContext){
        assert!(amount > 0, error::margin_amount_must_be_greater_than_zero());
        let user = tx_context::sender(ctx);

        assert!(table::contains(perpetual::positions(perp), user), error::user_has_no_position_in_table(2));

        let perpID = object::uid_to_inner(perpetual::id(perp));
        let perpAddres = object::id_to_address(&perpID);

        let balance = table::borrow_mut(perpetual::positions(perp), user);

        let qPos = position::qPos(*balance);
        let margin = position::margin(*balance);

        assert!(qPos > 0, error::user_position_size_is_zero(2));

        // Transfer margin amount from user to perpetual in margin bank
        margin_bank::transfer_margin_to_account(
            bank,
            user, 
            perpAddres, 
            amount,
            3
        );

        // update margin of user in storage
        position::set_margin(balance, margin + amount);

        // TODO: apply funding rate
        // user must add enough margin that can pay for its all settlement dues
        
        position::emit_position_update_event(perpID, user, *balance, ACTION_ADD_MARGIN);


    }

    /**
     * Allows caller to remove margin from their position
     */
    public entry fun remove_margin(perp: &mut Perpetual, bank: &mut Bank, amount: u128, ctx: &mut TxContext){
        assert!(amount > 0, error::margin_amount_must_be_greater_than_zero());

        let user = tx_context::sender(ctx);
        let priceOracle = price_oracle::price(perpetual::priceOracle(perp));

        assert!(table::contains(perpetual::positions(perp), user), error::user_has_no_position_in_table(2));

        let perpID = object::uid_to_inner(perpetual::id(perp));
        let perpAddres = object::id_to_address(&perpID);

        let initBalance = *table::borrow(perpetual::positions(perp), user);
        let balance = table::borrow_mut(perpetual::positions(perp), user);

        let qPos = position::qPos(*balance);
        let margin = position::margin(*balance);

        assert!(qPos > 0, error::user_position_size_is_zero(2));


        let maxRemovableAmount = margin_math::get_max_removeable_margin(*balance, priceOracle);

        assert!(amount <= maxRemovableAmount, error::margin_must_be_less_than_max_removable_margin());
        
        // transfer margin amount from perpetual to user address in margin bank
        margin_bank::transfer_margin_to_account(
            bank,
            perpAddres, 
            user, 
            amount,
            2
        );


        // update margin of user in storage
        position::set_margin(balance, margin - amount);

        // TODO: apply funding rate

        let currBalance = *table::borrow(perpetual::positions(perp), user);

        position::verify_collat_checks(
            initBalance, 
            currBalance, 
            perpetual::imr(perp), 
            perpetual::mmr(perp), 
            priceOracle, 
            0, 
            0);
            
        position::emit_position_update_event(perpID, user, currBalance, ACTION_REMOVE_MARGIN);

    }


    /**
     * Allows caller to adjust their leverage
     */
    public entry fun adjust_leverage(perp: &mut Perpetual, bank: &mut Bank, leverage: u128, ctx: &mut TxContext){

        // get precise(whole number) leverage 1, 2, 3...n
        leverage = library::round_down(leverage);

        assert!(leverage > 0, error::leverage_can_not_be_set_to_zero());

        let user = tx_context::sender(ctx);
        let priceOracle = price_oracle::price(perpetual::priceOracle(perp));
        let tradeChecks = perpetual::checks(perp);
        let perpID = object::uid_to_inner(perpetual::id(perp));
        let perpAddres = object::id_to_address(&perpID);

        assert!(table::contains(perpetual::positions(perp), user), error::user_has_no_position_in_table(2));

        // TODO: apply funding rate and get updated position Balance
        // initBalance will be returned by funding rate method
        let initBalance = *table::borrow(perpetual::positions(perp), user);

        let balance = table::borrow_mut(perpetual::positions(perp), user);
        let margin = position::margin(*balance);

        let targetMargin = margin_math::get_target_margin(*balance, leverage, priceOracle);

        if(margin > targetMargin){
            // if user position has more margin than required for leverage, 
            // move extra margin back to bank
            margin_bank::transfer_margin_to_account(
                bank,
                perpAddres, 
                user, 
                margin - targetMargin,
                2
            );

        } else if (margin < targetMargin) {
            // if user position has < margin than required target margin, 
            // move required margin from bank to perpetual
            margin_bank::transfer_margin_to_account(
                bank,
                user, 
                perpAddres, 
                targetMargin - margin,
                3
            );
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

        position::verify_collat_checks(
            initBalance,
            currBalance,
            perpetual::imr(perp), 
            perpetual::mmr(perp), 
            priceOracle, 
            0, 
            0);

        position::emit_position_update_event(perpID, user, currBalance, ACTION_ADJUST_LEVERAGE);
    }

    // //===========================================================//
    // //                      HELPER METHODS
    // //===========================================================//

    fun is_valid_settlement_operator(operatorTable: &mut Table<address, bool>, sender:address):bool{
        return table::contains(operatorTable, sender)
    }
    
}
