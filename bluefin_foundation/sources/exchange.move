
module bluefin_foundation::exchange {

    use sui::object::{Self};
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};
    use sui::transfer;

    // custom modules
    use bluefin_foundation::position::{Self, UserPosition};
    use bluefin_foundation::price_oracle::{Self};
    use bluefin_foundation::perpetual::{Self, Perpetual};
    use bluefin_foundation::margin_bank::{Self, Bank};
    use bluefin_foundation::evaluator::{Self};
    use bluefin_foundation::library::{Self};
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::margin_math::{Self};
    use bluefin_foundation::signed_number::{Self};
    
    // roles and capabilities
    use bluefin_foundation::roles::{
        Self, 
        ExchangeAdminCap, 
        PriceOracleOperatorCap, 
        CapabilitiesSafe,
        SettlementCap,
        DeleveragingCap
        };

    // traders
    use bluefin_foundation::isolated_trading::{Self, OrderStatus};
    use bluefin_foundation::isolated_liquidation::{Self};
    use bluefin_foundation::isolated_adl::{Self};

    //===========================================================//
    //                      CONSTANTS                            // 
    //===========================================================//

    // action types
    const ACTION_ADD_MARGIN: u8 = 1;
    const ACTION_REMOVE_MARGIN: u8 = 2;
    const ACTION_ADJUST_LEVERAGE: u8 = 3;
    const ACTION_FINAL_WITHDRAWAL: u8 = 4;
     
    //===========================================================//
    //                      INITIALIZATION                       //
    //===========================================================//

    fun init(ctx: &mut TxContext) {        
        // create orders filled quantity table
        let orders = table::new<vector<u8>, OrderStatus>(ctx);
        transfer::share_object(orders);   
    }

    
    //===========================================================//
    //                      ENTRY METHODS                        //
    //===========================================================//


    /**
     * Creates a perpetual
     * Only Admin can create one
     * Transfers adminship of created perpetual to admin
     */
    entry fun create_perpetual(
        _: &ExchangeAdminCap,
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
        let perpID =  object::uid_to_inner(&id);

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
            perpID, 
            maxAllowedPriceDiffInOP,
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
    entry fun set_min_price( _: &ExchangeAdminCap, perp: &mut Perpetual, minPrice: u128){
        evaluator::set_min_price(
            object::uid_to_inner(perpetual::id(perp)), 
            perpetual::mut_checks(perp), 
            minPrice);
    }   

    /** Updates maximum price of the perpetual 
     * Only Admin can update price
     */
    entry fun set_max_price( _: &ExchangeAdminCap, perp: &mut Perpetual, maxPrice: u128){
        evaluator::set_max_price(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), maxPrice);
    }   

    /**
     * Updates step size of the perpetual 
     * Only Admin can update size
     */
    entry fun set_step_size( _: &ExchangeAdminCap, perp: &mut Perpetual, stepSize: u128){
        evaluator::set_step_size(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), stepSize);
    }   

    /**
     * Updates tick size of the perpetual 
     * Only Admin can update size
     */
    entry fun set_tick_size( _: &ExchangeAdminCap, perp: &mut Perpetual, tickSize: u128){
        evaluator::set_tick_size(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), tickSize);
    }   

    /**
     * Updates market take bound (long) of the perpetual 
     * Only Admin can update MTB long
     */
    entry fun set_mtb_long( _: &ExchangeAdminCap, perp: &mut Perpetual, mtbLong: u128){
        evaluator::set_mtb_long(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), mtbLong);
    }  

    /**
     * Updates market take bound (short) of the perpetual 
     * Only Admin can update MTB short
     */
    entry fun set_mtb_short( _: &ExchangeAdminCap, perp: &mut Perpetual, mtbShort: u128){
        evaluator::set_mtb_short(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), mtbShort);
    }   

    /**
     * Updates maximum quantity for limit orders of the perpetual 
     * Only Admin can update max qty
     */
    entry fun set_max_qty_limit( _: &ExchangeAdminCap, perp: &mut Perpetual, quantity: u128){
        evaluator::set_max_qty_limit(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), quantity);
    }   

    /**
     * Updates maximum quantity for market orders of the perpetual 
     * Only Admin can update max qty
     */
    entry fun set_max_qty_market( _: &ExchangeAdminCap, perp: &mut Perpetual, quantity: u128){
        evaluator::set_max_qty_market(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), quantity);
    }  

    /**
     * Updates minimum quantity of the perpetual 
     * Only Admin can update max qty
     */
    entry fun set_min_qty( _: &ExchangeAdminCap, perp: &mut Perpetual, quantity: u128){
        evaluator::set_min_qty(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), quantity);
    }   

    /**
     * updates max allowed oi open for selected mro
     * Only Admin can update max allowed OI open
     */
    entry fun set_max_oi_open( _: &ExchangeAdminCap, perp: &mut Perpetual, maxLimit: vector<u128>){
        evaluator::set_max_oi_open(object::uid_to_inner(perpetual::id(perp)), perpetual::mut_checks(perp), maxLimit);
    }

    /*
     * Sets PriceOracle  
     */
    entry fun set_oracle_price(safe: &CapabilitiesSafe, cap: &PriceOracleOperatorCap, perp: &mut Perpetual, price: u128){
        let perpID = object::uid_to_inner(perpetual::id(perp));
        price_oracle::set_oracle_price(
            safe,
            cap, 
            perpetual::mut_priceOracle(perp),
            perpID, 
            price
            );
    }

    /*
     * Sets Max difference allowed in percentage between New Oracle Price & Old Oracle Price
     */
    entry fun set_oracle_price_max_allowed_diff(_: &ExchangeAdminCap, perp: &mut Perpetual, maxAllowedPriceDifference: u128){
        price_oracle::set_oracle_price_max_allowed_diff(
            object::uid_to_inner(perpetual::id(perp)),
            perpetual::mut_priceOracle(perp),
            maxAllowedPriceDifference);
    }

    //===========================================================//
    //                          TRADES                           //
    //===========================================================//

    /**
     * Used to perofrm on-chain trade between two orders (maker/taker)
     */ 
    entry fun trade(
        perp: &mut Perpetual, 
        bank: &mut Bank, 
        safe: &CapabilitiesSafe,
        cap: &SettlementCap,

        ordersTable: &mut Table<vector<u8>, OrderStatus>,

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
        
        ctx: &mut TxContext        
        ){
            // ensure perpetual is not delisted
            assert!(!perpetual::delisted(perp), error::perpetual_is_delisted());
            
            // only settlement operators can trade
            roles::check_settlement_operator_validity(safe, cap);

            
            let sender = tx_context::sender(ctx);


            // TODO check if trading is allowed by guardian for given perpetual or not

            // TODO check if trading is started or not

            // TODO apply funding rate

            let perpID = object::uid_to_inner(perpetual::id(perp));
            let perpAddress = object::id_to_address(&perpID);


            let data = isolated_trading::pack_trade_data(
                 // maker
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
                price,

                // perp id/address
                object::id_to_address(&perpID)
            );

            let tradeResponse = isolated_trading::trade(sender, perp, ordersTable, data);


             // transfer margins between perp and accounts
            margin_bank::transfer_trade_margin(
                bank,
                perpAddress,
                makerAddress,
                takerAddress,
                isolated_trading::makerFundsFlow(tradeResponse),
                isolated_trading::takerFundsFlow(tradeResponse)
            );

            // transfer fee to fee pool from perpetual
            let fee = isolated_trading::fee(tradeResponse);
            if(fee > 0 ){
                margin_bank::transfer_margin_to_account(
                    bank, 
                    perpAddress, 
                    perpetual::feePool(perp), 
                    fee, 
                    2
                );
            }
    }

    /**
     * Used to perofrm liquidation trade between the liquidator and
     * an under collat account
     */ 
    entry fun liquidate(
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

        // ensure perpetual is not delisted
        assert!(!perpetual::delisted(perp), error::perpetual_is_delisted());

        let sender = tx_context::sender(ctx);

        // check if caller has permission to trade on taker's behalf
        // we can have sub accounts feature in future
        assert!(
            sender == liquidator,
            error::sender_does_not_have_permission_for_account(1));

        // TODO check if trading is allowed by guardian for given perpetual or not

        // TODO check if trading is started or not

        // TODO apply funding rate

        let perpAddress = object::id_to_address(&object::uid_to_inner(perpetual::id(perp)));

        let data = isolated_liquidation::pack_trade_data(
            liquidator,
            liquidatee,
            quantity,
            leverage,
            allOrNothing);

        let tradeResponse = isolated_liquidation::trade(sender, perp, data);


        // transfer premium amount between perpetual/liquidator 
        // and insurance pool

        let liqPortion = isolated_liquidation::liquidatorPortion(tradeResponse);
        let poolPortion = isolated_liquidation::insurancePoolPortion(tradeResponse);

        // if liquidator's portion is positive
        if(signed_number::gt_uint(liqPortion, 0)){
            // transfer percentage of premium to liquidator
            margin_bank::transfer_margin_to_account(
                bank,
                perpAddress,
                liquidator,
                signed_number::value(liqPortion), 
                2, 
            )
        }
        // if negative, implies under water/bankrupt liquidation
        else if(signed_number::lt_uint(liqPortion, 0)){
            // transfer negative liquidation premium from liquidator to perpetual
            margin_bank::transfer_margin_to_account(
                bank,
                liquidator,
                perpAddress,
                signed_number::value(liqPortion), 
                1, 
            )
        };

        // insurance pool portion
        if(signed_number::gt_uint(poolPortion, 0)){
            // transfer percentage of premium to insurance pool
            margin_bank::transfer_margin_to_account(
                bank,
                perpAddress,
                perpetual::insurancePool(perp),
                signed_number::value(poolPortion), 
                2, 
            )
        };

        // transfer margins between perp and accounts
        margin_bank::transfer_trade_margin(
            bank,
            perpAddress,
            liquidatee,
            liquidator,
            isolated_liquidation::makerFundsFlow(tradeResponse),
            isolated_liquidation::takerFundsFlow(tradeResponse)
        );
        
     }


    /**
     * Used to perofrm adl trade between an under water maker and 
     * above water taker
     */
     entry fun deleverage(
        perp: &mut Perpetual, 
        bank: &mut Bank, 
        safe: &CapabilitiesSafe,
        cap: &DeleveragingCap,

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

        // ensure perpetual is not delisted
        assert!(!perpetual::delisted(perp), error::perpetual_is_delisted());

        roles::check_delevearging_operator_validity(safe, cap);

        let sender = tx_context::sender(ctx);


        // TODO check if trading is allowed by guardian for given perpetual or not

        // TODO check if trading is started or not

        // TODO apply funding rate

        let perpAddress = object::id_to_address(&object::uid_to_inner(perpetual::id(perp)));

        let data = isolated_adl::pack_trade_data(
            maker,
            taker,
            quantity,
            allOrNothing);

        let tradeResponse = isolated_adl::trade(sender, perp, data);
        
        // transfer margins between perp and accounts
        margin_bank::transfer_trade_margin(
            bank,
            perpAddress,
            maker,
            taker,
            isolated_adl::makerFundsFlow(tradeResponse),
            isolated_adl::takerFundsFlow(tradeResponse)
        );

    }


    //===========================================================//
    //                       MARGIN ADJUSTMENT                   //
    //===========================================================//

    /**
     * Allows caller to add margin to their position
     */
    entry fun add_margin(perp: &mut Perpetual, bank: &mut Bank, amount: u128, ctx: &mut TxContext){
        
        // ensure perpetual is not delisted
        assert!(!perpetual::delisted(perp), error::perpetual_is_delisted());

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
    entry fun remove_margin(perp: &mut Perpetual, bank: &mut Bank, amount: u128, ctx: &mut TxContext){
        
        // ensure perpetual is not delisted
        assert!(!perpetual::delisted(perp), error::perpetual_is_delisted());


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
    entry fun adjust_leverage(perp: &mut Perpetual, bank: &mut Bank, leverage: u128, ctx: &mut TxContext){

        // ensure perpetual is not delisted
        assert!(!perpetual::delisted(perp), error::perpetual_is_delisted());

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
    

    //===========================================================//
    //                     CLOSE POSITION                        //
    //===========================================================//


    entry fun close_position(perp: &mut Perpetual, bank: &mut Bank, ctx: &mut TxContext){

        // ensure perpetual is delisted before users can close their position
        assert!(perpetual::delisted(perp), error::perpetual_is_not_delisted());

        let user = tx_context::sender(ctx);
        
        assert!(table::contains(perpetual::positions(perp), user), error::user_has_no_position_in_table(2));
        
        let perpID = object::uid_to_inner(perpetual::id(perp));
        let perpAddress = object::id_to_address(&perpID);
        let delistingPrice = perpetual::delistingPrice(perp);

        // TODO: apply funding rate and get updated position Balance
        // initBalance will be returned by funding rate method
        let userPos = table::borrow_mut(perpetual::positions(perp), user);
        
        assert!(position::qPos(*userPos) > 0, error::user_position_size_is_zero(2));

        let perpBalance = margin_bank::get_balance(bank, perpAddress);

        // get margin to be returned to user
        let marginLeft = margin_math::get_margin_left(*userPos, delistingPrice, perpBalance);


        // set user position to zero
        position::set_qPos(userPos, 0);

        // transfer margin to user account
        margin_bank::transfer_margin_to_account(
            bank,
            perpAddress, 
            user,
            marginLeft,
            2
        );

        position::emit_position_closed_event(perpID, user, marginLeft);
        position::emit_position_update_event(perpID, user, *userPos, ACTION_FINAL_WITHDRAWAL);

    }
}
