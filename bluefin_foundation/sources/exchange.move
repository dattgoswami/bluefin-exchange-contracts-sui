
module bluefin_foundation::exchange {

    use sui::clock::{Self, Clock};
    use sui::object::{Self, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};
    use sui::event::{emit};
    use sui::transfer;


    // custom modules
    use bluefin_foundation::position::{Self, UserPosition};
    use bluefin_foundation::perpetual::{Self, Perpetual};
    use bluefin_foundation::margin_bank::{Self, Bank};
    use bluefin_foundation::order::{Self, OrderStatus};
    use bluefin_foundation::signed_number::{Self, Number};
    use bluefin_foundation::funding_rate::{Self};
    use bluefin_foundation::evaluator::{Self};
    use bluefin_foundation::library::{Self};
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::margin_math::{Self};

    // roles and capabilities
    use bluefin_foundation::roles::{
        Self, 
        ExchangeAdminCap, 
        CapabilitiesSafe,
        SettlementCap,
        DeleveragingCap,
        SubAccounts,
        };

    // traders
    use bluefin_foundation::isolated_trading::{Self};
    use bluefin_foundation::isolated_liquidation::{Self};
    use bluefin_foundation::isolated_adl::{Self};


    //Pyth
    use Pyth::price_info::{PriceInfoObject as PythFeeder};
    


    //===========================================================//
    //                      CONSTANTS                            // 
    //===========================================================//

    // action types
    const ACTION_ADD_MARGIN: u8 = 1;
    const ACTION_REMOVE_MARGIN: u8 = 2;
    const ACTION_ADJUST_LEVERAGE: u8 = 3;
    const ACTION_FINAL_WITHDRAWAL: u8 = 4;
     

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    /// @notice emitted when a liquidator account pays for settling and account's pending settlement amount
    struct LiquidatorPaidForAccountSettlementEvnet has copy, drop {
        id: ID,
        liquidator: address,
        account: address,
        amount: u128
    }

    /// @notice emitted when oi open of account < settlement amount during adl trade
    struct SettlementAmountNotPaidCompletelyEvent has copy, drop {
        account: address,
        amount: u128
    }

    /// @notice emitted when oi open of account < settlement amount during adl trade
    struct SettlementAmtDueByMakerEvent has copy, drop {
        account: address,
        amount: u128
    }

    /// @notice emitted when oi open of account < settlement amount during adl trade
    struct AccountSettlementUpdateEvent has copy, drop {
        account: address,
        balance: UserPosition,
        settlementIsPositive: bool,
        settlementAmount: u128,
        price: u128,
        fundingRate: Number
    }

    //===========================================================//
    //                      INITIALIZATION
    //===========================================================//

    fun init(ctx: &mut TxContext) {        
        // create orders filled quantity table
        let orders = table::new<vector<u8>, OrderStatus>(ctx);
        transfer::public_share_object(orders);   
    }
    
    //===========================================================//
    //                      ENTRY METHODS                        //
    //===========================================================//


    /**
     * Creates a perpetual
     * Only Admin can create one
     * Created perpetual is publically shared for any one to use
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
        insurancePoolRatio: u128,
        insurancePool: address,
        feePool: address,
        startTime: u64,
        priceIdentifierId: vector<u8>,
        ctx: &mut TxContext
        ){
        
        let positions = table::new<address, UserPosition>(ctx);
            
        // creates perpetual and shares it
        let perpID = perpetual::initialize(
            name,
            imr,
            mmr,
            makerFee,
            takerFee,
            insurancePoolRatio,
            insurancePool,
            feePool,
            minPrice,
            maxPrice,
            tickSize,
            minQty,
            maxQtyLimit,
            maxQtyMarket,
            stepSize,
            mtbLong,
            mtbShort,
            maxAllowedFR,
            startTime,
            maxAllowedOIOpen,
            positions,
            priceIdentifierId,
            ctx
        );

        // create bank account for perpetual
        margin_bank::initialize_account(
            margin_bank::mut_accounts(bank), 
            object::id_to_address(&perpID),
        );

        // create bank account for insurance pool of perpetual
        margin_bank::initialize_account(
            margin_bank::mut_accounts(bank), 
            insurancePool,
        );

        // create bank account for fee pool of perpetual
        margin_bank::initialize_account(
            margin_bank::mut_accounts(bank), 
            feePool,
        );

    }

    //===========================================================//
    //                          TRADES                           //
    //===========================================================//

    /**
     * Used to perofrm on-chain trade between two orders (maker/taker)
     */ 
    entry fun trade(
        clock: &Clock,
        perp: &mut Perpetual, 
        bank: &mut Bank, 
        safe: &CapabilitiesSafe,
        cap: &SettlementCap,

        subAccounts: &SubAccounts, 
        ordersTable: &mut Table<vector<u8>, OrderStatus>,

        // maker
        makerFlags:u8,
        makerPrice: u128,
        makerQuantity: u128,
        makerLeverage: u128,
        makerExpiration: u64,
        makerSalt: u128,
        makerAddress: address,
        makerSignature:vector<u8>,

        // taker
        takerFlags:u8,
        takerPrice: u128,
        takerQuantity: u128,
        takerLeverage: u128,
        takerExpiration: u64,
        takerSalt: u128,
        takerAddress: address,
        takerSignature:vector<u8>,

        // fill
        quantity: u128, 
        price: u128, 

        //This is used to get PythInfoObject from whoever is calling this
        // function, this will get us ORACLE PRICE FROM PYTH 
        price_info_obj: &PythFeeder,

        
        ctx: &mut TxContext
        ){
            //To ensure that priceOracleFeed Id set in perpetual is same as the one given
            let priceIdentifierBytes = library::get_price_identifier(price_info_obj);  
            let priceIdentifierPerp = perpetual::priceIdenfitier(perp);
            assert!(priceIdentifierBytes==priceIdentifierPerp, error::wrong_price_identifier());

            let oraclePrice = library::get_oracle_price(price_info_obj);
            perpetual::set_oracle_price(perp, oraclePrice);
         

            let sender = tx_context::sender(ctx);

            // ensure perpetual is not delisted
            assert!(!perpetual::delisted(perp), error::perpetual_is_delisted());

            // ensure trading is allowed on the perp
            assert!(perpetual::is_trading_permitted(perp), error::trading_is_stopped_on_perpetual());

            // ensure trading is started
            assert!(
                clock::timestamp_ms(clock) > perpetual::startTime(perp), 
                error::trading_not_started());

            // if the maker or taker order was signed to be executed through 
            // orderbook, it should only be executed by a settlement operator
            if (order::flag_orderbook_only(makerFlags) || order::flag_orderbook_only(takerFlags)){
                // only settlement operators can trade
                roles::check_settlement_operator_validity(safe, cap);
            } else {
                // ensure that capability provided is public settlement cap
                roles::check_public_settlement_cap_validity(safe, cap);

                // the sender must be the taker or a sub account of taker
                assert!(sender == takerAddress || roles::is_sub_account(subAccounts, takerAddress, sender),
                    error::only_taker_of_trade_can_execute_trade_involving_non_orderbook_orders()
                );
            }; 
        

            let perpID = object::uid_to_inner(perpetual::id(perp));
            let perpAddress = object::id_to_address(&perpID);

            // if maker/taker positions don't exist create them
            position::create_position(perpID, perpetual::positions(perp), makerAddress);
            position::create_position(perpID, perpetual::positions(perp), takerAddress);

            // apply funding rate to maker
            apply_funding_rate(
                bank,
                perp,
                sender,
                makerAddress,
                isolated_trading::tradeType(),
                0 // offset is 0 for maker
            );

            // apply funding rate to taker
            apply_funding_rate(
                bank,
                perp,
                sender,
                takerAddress,
                isolated_trading::tradeType(),
                1 // offset is 1 for taker
            );

            let data = isolated_trading::pack_trade_data(
                 // maker
                makerFlags,
                makerPrice, 
                makerQuantity, 
                makerLeverage, 
                makerAddress, 
                makerExpiration, 
                makerSalt, 
                makerSignature,

                // taker
                takerFlags,
                takerPrice, 
                takerQuantity, 
                takerLeverage, 
                takerAddress, 
                takerExpiration, 
                takerSalt, 
                takerSignature,

                // fill
                quantity,
                price,

                // perp id/address
                object::id_to_address(&perpID),
                
                // current time
                clock::timestamp_ms(clock)
            );
            

            let tradeResponse = isolated_trading::trade(sender, perp, ordersTable, subAccounts, data);


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
        clock: &Clock,
        perp: &mut Perpetual,
        bank: &mut Bank, 
        subAccounts: &SubAccounts,

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

        // ensure trading is allowed on the perp
        assert!(perpetual::is_trading_permitted(perp), error::trading_is_stopped_on_perpetual());

        // ensure trading is started
        assert!(clock::timestamp_ms(clock) > perpetual::startTime(perp), error::trading_not_started());

        let sender = tx_context::sender(ctx);

        // TODO check if trading is allowed by guardian for given perpetual or not

        assert!(clock::timestamp_ms(clock) > perpetual::startTime(perp), error::trading_not_started());

        // check if caller has permission to trade on taker's behalf
        assert!(
            sender == liquidator || roles::is_sub_account(subAccounts, liquidator, sender),
            error::sender_does_not_have_permission_for_account(1));

        let perpID = object::uid_to_inner(perpetual::id(perp));
        let perpAddress = object::id_to_address(&perpID);

        // create liquidatee/liquidator position if not exists
        position::create_position(perpID, perpetual::positions(perp), liquidatee);
        position::create_position(perpID, perpetual::positions(perp), liquidator);

        // apply funding rate to maker
        apply_funding_rate(
            bank,
            perp,
            sender,
            liquidatee,
            isolated_liquidation::tradeType(),
            0 // offset is 0 for maker
        );

        // apply funding rate to taker
        apply_funding_rate(
            bank,
            perp,
            sender,
            liquidator,
            isolated_liquidation::tradeType(),
            1 // offset is 1 for taker
        );

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
        clock: &Clock,
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

        // ensure trading is allowed on the perp
        assert!(perpetual::is_trading_permitted(perp), error::trading_is_stopped_on_perpetual());

        // ensure trading is allowed on the perp
        assert!(clock::timestamp_ms(clock) > perpetual::startTime(perp), error::trading_not_started());

        roles::check_delevearging_operator_validity(safe, cap);

        let sender = tx_context::sender(ctx);
        let perpID = object::uid_to_inner(perpetual::id(perp));
        let perpAddress = object::id_to_address(&perpID);

        // create maker/taker position if not exists
        position::create_position(perpID, perpetual::positions(perp), maker);
        position::create_position(perpID, perpetual::positions(perp), taker);


        // apply funding rate to maker
        apply_funding_rate(
            bank,
            perp,
            sender,
            maker,
            isolated_adl::tradeType(),
            0 // offset is 0 for maker
        );

        // apply funding rate to taker
        apply_funding_rate(
            bank,
            perp,
            sender,
            taker,
            isolated_adl::tradeType(),
            1 // offset is 1 for taker
        );



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
    entry fun add_margin(perp: &mut Perpetual, bank: &mut Bank, subAccounts: &SubAccounts, user:address, amount: u128, ctx: &mut TxContext){

        let caller = tx_context::sender(ctx);

        // check if caller has permission for account
        assert!(
            caller == user || roles::is_sub_account(subAccounts, user, caller),
            error::sender_does_not_have_permission_for_account(2)
            );

        // ensure perpetual is not delisted
        assert!(!perpetual::delisted(perp), error::perpetual_is_delisted());
        assert!(amount > 0, error::margin_amount_must_be_greater_than_zero());

        assert!(table::contains(perpetual::positions(perp), user), error::user_has_no_position_in_table(2));


        let perpID = object::uid_to_inner(perpetual::id(perp));
        let perpAddress = object::id_to_address(&perpID);

        let balance = table::borrow_mut(perpetual::positions(perp), user);

        let qPos = position::qPos(*balance);
        let margin = position::margin(*balance);

        assert!(qPos > 0, error::user_position_size_is_zero(2));

        // Transfer margin amount from user to perpetual in margin bank
        margin_bank::transfer_margin_to_account(
            bank,
            user, 
            perpAddress, 
            amount,
            3
        );

        // update margin of user in storage
        position::set_margin(balance, margin + amount);
        
        position::emit_position_update_event(*balance, caller, ACTION_ADD_MARGIN);

        // user must add enough margin that can pay for its all settlement dues
        apply_funding_rate(
            bank,
            perp,
            user,
            user,
            0,
            2
        );
    }

    /**
     * Allows caller to remove margin from their position
     */
    entry fun remove_margin(perp: &mut Perpetual, bank: &mut Bank, subAccounts: &SubAccounts, user: address, amount: u128, ctx: &mut TxContext){
        
        let caller = tx_context::sender(ctx);

        // check if caller has permission for account
        assert!(
            caller == user || roles::is_sub_account(subAccounts, user, caller),
            error::sender_does_not_have_permission_for_account(2)
            );

        // ensure perpetual is not delisted
        assert!(!perpetual::delisted(perp), error::perpetual_is_delisted());

        assert!(amount > 0, error::margin_amount_must_be_greater_than_zero());

        let priceOracle = perpetual::priceOracle(perp);

        assert!(table::contains(perpetual::positions(perp), user), error::user_has_no_position_in_table(2));

        let perpID = object::uid_to_inner(perpetual::id(perp));
        let perpAddress = object::id_to_address(&perpID);

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
            perpAddress, 
            user, 
            amount,
            2
        );


        // update margin of user in storage
        position::set_margin(balance, margin - amount);

        // user must have enough margin to pay for their settlement dues
        apply_funding_rate(
            bank,
            perp,
            user,
            user,
            0,
            2
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
            
        position::emit_position_update_event(currBalance, caller, ACTION_REMOVE_MARGIN);

    }

    /**
     * Allows caller to adjust their leverage
     */
    entry fun adjust_leverage(perp: &mut Perpetual, bank: &mut Bank, subAccounts: &SubAccounts, user: address, leverage: u128, ctx: &mut TxContext){

        let caller = tx_context::sender(ctx);

        // check if caller has permission for account
        assert!(
            caller == user || roles::is_sub_account(subAccounts, user, caller),
            error::sender_does_not_have_permission_for_account(2)
            );

        // ensure perpetual is not delisted
        assert!(!perpetual::delisted(perp), error::perpetual_is_delisted());

        // get precise(whole number) leverage 1, 2, 3...n
        leverage = library::round_down(leverage);

        assert!(leverage > 0, error::leverage_can_not_be_set_to_zero());

        let priceOracle = perpetual::priceOracle(perp);
        let tradeChecks = perpetual::checks(perp);
        let perpID = object::uid_to_inner(perpetual::id(perp));
        let perpAddress = object::id_to_address(&perpID);

        assert!(table::contains(perpetual::positions(perp), user), error::user_has_no_position_in_table(2));

        // user must have enough margin to pay for their settlement dues
        apply_funding_rate(
            bank,
            perp,
            user,
            user,
            0,
            2
        );
        
        let initBalance = *table::borrow(perpetual::positions(perp), user);

        let balance = table::borrow_mut(perpetual::positions(perp), user);
        let margin = position::margin(*balance);

        let targetMargin = margin_math::get_target_margin(*balance, leverage, priceOracle);

        if(margin > targetMargin){
            // if user position has more margin than required for leverage, 
            // move extra margin back to bank
            margin_bank::transfer_margin_to_account(
                bank,
                perpAddress, 
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
                perpAddress, 
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

        position::emit_position_update_event(currBalance, caller, ACTION_ADJUST_LEVERAGE);
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

        apply_funding_rate(
            bank,
            perp,
            user,
            user,
            0,
            2
        );      
          
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
        position::emit_position_update_event(*userPos, user, ACTION_FINAL_WITHDRAWAL);

    }


    //===========================================================//
    //                        FUNDING RATE                       //
    //===========================================================//

    fun apply_funding_rate(bank: &mut Bank, perp: &mut Perpetual, caller: address, user: address, flag: u8, offset:u64){
        
        let perpID = object::uid_to_inner(perpetual::id(perp));
        let perpAddress = object::id_to_address(&perpID);

        // oracle price
        let price = perpetual::priceOracle(perp);

        let fundingRate = perpetual::fundingRate(perp);

        // get perp global index
        let globalIndex = funding_rate::index(fundingRate);

        let userPos = table::borrow_mut(perpetual::positions(perp), user);

        // get user's local index
        let localIndex = position::index(*userPos);

         // If timestamp didn't change, index doesn't change
        if (funding_rate::are_indexes_equal(localIndex, globalIndex)){
            return
        };

        let margin = position::margin(*userPos);
        let qPos = position::qPos(*userPos);
        let oiOpen = position::oiOpen(*userPos);
        let isPosPositive = position::isPosPositive(*userPos);

        // Considering position direction, compute the correct difference between indices
        let indexDiff = if (isPosPositive) {
            signed_number::sub(funding_rate::index_value(localIndex), funding_rate::index_value(globalIndex))
        } else {
            signed_number::sub(funding_rate::index_value(globalIndex), funding_rate::index_value(localIndex))
        };

        // Apply the funding payment as the difference of indices scaled by position quantity
        // To avoid capital leakage due to rounding errors, round debits up and credits down
        // signed_number::value() returns positive value
        // TODO see if we need base_mul_roundup over here
        let settlementAmount = library::base_mul(signed_number::value(indexDiff), qPos);
        if (signed_number::gt_uint(indexDiff, 0)) {
            position::set_margin(userPos, margin + settlementAmount);
        }        
        else { 
            // if position is being closed (post perp de-list),
            // margin is being updated, leverage is being adjusted or a
            // a normal trade is being performed, ensure that user has margin
            // to putup for pending settlement amount
            if (flag == 0 || flag == 1) {                
                assert!(margin >= settlementAmount, error::funding_due_exceeds_margin(offset))
            } 
            // if liquidation is being performed
            else if (flag==2){
                // and the user has not enough margin to pay for settlement
                if (margin < settlementAmount) {                
                    // the liquidator collateralized the position to pay for settlement amount
                    let amount = settlementAmount - margin;
                    margin_bank::transfer_margin_to_account(
                        bank,
                        caller, 
                        perpAddress, 
                        amount,
                        1 // taker is transferring amount (as caller is the taker/liquidator in liquidaiton trade)
                    );

                    emit(LiquidatorPaidForAccountSettlementEvnet{
                        id: perpID,
                        liquidator: caller,
                        account: user,
                        amount
                    });    

                    settlementAmount =  settlementAmount - amount;
                }
            }
            // a deleveraging trade is being performed
            else {
                if(margin < settlementAmount){
                    // Don't settle the funding against perpetual for the maker.
                    // modifying it this way will make the contract solvent because the taker
                    // will ADL at a worse price than the bankruptcy price, leaving the money
                    // to keep the contract solvent due to maker's negative funding due
                    // in the contract.
                    if(isPosPositive){
                        position::set_oiOpen(userPos, oiOpen + settlementAmount);
                    } else {
                        if (settlementAmount > oiOpen) {
                            position::set_oiOpen(userPos, 0);
                            emit(SettlementAmountNotPaidCompletelyEvent{
                                account: user,
                                amount: settlementAmount - oiOpen
                            });
                        } else {
                            position::set_oiOpen(userPos, oiOpen - settlementAmount);
                        };

                    };

                    emit(SettlementAmtDueByMakerEvent{
                        account:user, 
                        amount: settlementAmount
                        });

                    settlementAmount = 0;
                };
            };

            // reduce user's margin by settlement amount
            position::set_margin(userPos, margin - settlementAmount);

            // update user index to global index
            position::set_index(userPos, globalIndex);


        };
       
        emit(AccountSettlementUpdateEvent{
            account: user,
            balance: *userPos,
            settlementIsPositive: signed_number::sign(indexDiff),
            settlementAmount,
            price,
            fundingRate: funding_rate::rate(fundingRate)
        });

    }    
}
