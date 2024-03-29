
module bluefin_foundation::exchange {

    use sui::clock::{Self, Clock};
    use sui::object::{Self, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};
    use sui::event::{emit};


    // custom modules
    use bluefin_foundation::position::{Self, UserPosition};
    use bluefin_foundation::perpetual::{Self, PerpetualV2};
    use bluefin_foundation::margin_bank::{Self, BankV2};
    use bluefin_foundation::order::{OrderStatus};
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
        CapabilitiesSafeV2,
        SettlementCap,
        DeleveragingCap,
        SubAccountsV2,
        Sequencer,
        };

    // traders
    use bluefin_foundation::isolated_trading::{Self};
    use bluefin_foundation::isolated_liquidation::{Self};
    use bluefin_foundation::isolated_adl::{Self};


    // pyth
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

    #[allow(unused_field)]
    /// @notice emitted when a liquidator account pays for settling and account's pending settlement amount
    struct LiquidatorPaidForAccountSettlementEvnet has copy, drop {
        id: ID,
        liquidator: address,
        account: address,
        amount: u128
    }

    #[allow(unused_field)]
    /// @notice emitted when oi open of account < settlement amount during adl trade
    struct SettlementAmountNotPaidCompletelyEvent has copy, drop {
        account: address,
        amount: u128
    }

    #[allow(unused_field)]
    /// @notice emitted when oi open of account < settlement amount during adl trade
    struct SettlementAmtDueByMakerEvent has copy, drop {
        account: address,
        amount: u128
    }

    #[allow(unused_field)]
    /// @notice emitted when oi open of account < settlement amount during adl trade
    struct AccountSettlementUpdateEvent has copy, drop {
        account: address,
        balance: UserPosition,
        settlementIsPositive: bool,
        settlementAmount: u128,
        price: u128,
        fundingRate: Number
    }


    struct LiquidatorPaidForAccountSettlementEvnetV2 has copy, drop {
        tx_index:u128,
        id: ID,
        liquidator: address,
        account: address,
        amount: u128
    }

    /// @notice emitted when oi open of account < settlement amount during adl trade
    struct SettlementAmountNotPaidCompletelyEventV2 has copy, drop {
        tx_index:u128,
        account: address,
        amount: u128
    }

    /// @notice emitted when oi open of account < settlement amount during adl trade
    struct SettlementAmtDueByMakerEventV2 has copy, drop {
        tx_index:u128,
        account: address,
        amount: u128
    }

    /// @notice emitted when oi open of account < settlement amount during adl trade
    struct AccountSettlementUpdateEventV2 has copy, drop {
        tx_index:u128,
        account: address,
        balance: UserPosition,
        settlementIsPositive: bool,
        settlementAmount: u128,
        price: u128,
        fundingRate: Number
    }

    
    //===========================================================//
    //                      ENTRY METHODS                        //
    //===========================================================//


    /**
     * Creates a perpetual
     * Only Admin can create one
     * Created perpetual is publically shared for any one to use
     */
    entry fun create_perpetual<T>(
        _: &ExchangeAdminCap,
        bank: &mut BankV2<T>,

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

        assert!(margin_bank::get_version(bank) == roles::get_version(), error::object_version_mismatch());

        // input values are in 1e18, convert to 1e9
        minPrice = minPrice / library::base_uint();
        maxPrice = maxPrice / library::base_uint();
        tickSize = tickSize / library::base_uint();
        minQty = minQty / library::base_uint();
        maxQtyLimit = maxQtyLimit / library::base_uint();
        maxQtyMarket = maxQtyMarket / library::base_uint();
        stepSize = stepSize / library::base_uint();
        mtbLong = mtbLong / library::base_uint();
        mtbShort = mtbShort / library::base_uint();
        imr = imr / library::base_uint();
        mmr = mmr / library::base_uint();
        makerFee = makerFee / library::base_uint();
        takerFee = takerFee / library::base_uint();
        maxAllowedFR = maxAllowedFR / library::base_uint();
        insurancePoolRatio = insurancePoolRatio / library::base_uint();


        // convert max oi opens to 1e9
        let maxOIOpen = library::to_1x9_vec(maxAllowedOIOpen);

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
            maxOIOpen,
            priceIdentifierId,
            ctx
        );

        // create bank account for perpetual
        margin_bank::initialize_account(
            margin_bank::mut_accounts_v2(bank), 
            object::id_to_address(&perpID),
        );

        // create bank account for insurance pool of perpetual
        margin_bank::initialize_account(
            margin_bank::mut_accounts_v2(bank), 
            insurancePool,
        );

        // create bank account for fee pool of perpetual
        margin_bank::initialize_account(
            margin_bank::mut_accounts_v2(bank), 
            feePool,
        );

    }

    //===========================================================//
    //                          TRADES                           //
    //===========================================================//

    /**
     * Used to perofrm on-chain trade between two orders (maker/taker)
     */ 
    entry fun trade<T>(
        clock: &Clock,
        perp: &mut PerpetualV2, 
        bank: &mut BankV2<T>, 
        safe: &CapabilitiesSafeV2,
        subAccounts: &SubAccountsV2, 
        ordersTable: &mut Table<vector<u8>, OrderStatus>,
        sequencer: &mut Sequencer,
        cap: &SettlementCap,
        
        // pyth oracle
        price_oracle: &PythFeeder,

        // maker
        makerFlags:u8,
        makerPrice: u128,
        makerQuantity: u128,
        makerLeverage: u128,
        makerExpiration: u64,
        makerSalt: u128,
        makerAddress: address,
        makerSignature:vector<u8>,
        makerPublicKey:vector<u8>,

        // taker
        takerFlags:u8,
        takerPrice: u128,
        takerQuantity: u128,
        takerLeverage: u128,
        takerExpiration: u64,
        takerSalt: u128,
        takerAddress: address,
        takerSignature:vector<u8>,
        takerPublicKey:vector<u8>,

        // fill
        quantity: u128, 
        price: u128, 

        // a unique tx hash
        tx_hash: vector<u8>,

        ctx: & TxContext
        ){

            assert!(perpetual::get_version(perp) == roles::get_version(), error::object_version_mismatch());
            assert!(margin_bank::get_version(bank) == roles::get_version(), error::object_version_mismatch());
            roles::validate_sub_accounts_version(subAccounts);
            roles::validate_safe_version(safe);

            let tx_index = roles::validate_unique_tx(sequencer, tx_hash);

            // checks that provided price oracle is correct and updates perpetual with new price
            perpetual::update_oracle_price(perp, price_oracle);

            let sender = tx_context::sender(ctx);

            // ensure perpetual is not delisted
            assert!(!perpetual::delisted_v2(perp), error::perpetual_is_delisted());

            // ensure trading is allowed on the perp
            assert!(perpetual::is_trading_permitted_v2(perp), error::trading_is_stopped_on_perpetual());

            // ensure trading is started
            assert!(
                clock::timestamp_ms(clock) > perpetual::startTime_v2(perp), 
                error::trading_not_started());

            
            // since we are not validing the zk-login signature on-chain,
            // we can not allow users to trade directly on-chain as they could submit
            // a zk-login signature with a maker/taker order that may be wrong
            // causing maker to loose funds. 
            // The trade call can now only be performed by private settlement operators run by Bluefin!
            roles::check_settlement_operator_validity_v2(safe, cap);

            
            let perpID = object::uid_to_inner(perpetual::id_v2(perp));
            let perpAddress = object::id_to_address(&perpID);

            // if maker/taker positions don't exist create them
            position::create_position(perpID, perpetual::positions(perp), makerAddress);
            position::create_position(perpID, perpetual::positions(perp), takerAddress);

            // apply funding rate to maker
            apply_funding_rate(
                tx_index,
                bank,
                perp,
                sender,
                makerAddress,
                isolated_trading::tradeType(),
                0 // offset is 0 for maker
            );

            // apply funding rate to taker
            apply_funding_rate(
                tx_index,
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
                makerPublicKey,

                // taker
                takerFlags,
                takerPrice, 
                takerQuantity, 
                takerLeverage, 
                takerAddress, 
                takerExpiration, 
                takerSalt, 
                takerSignature,
                takerPublicKey,

                // fill
                quantity,
                price,

                // perp id/address
                object::id_to_address(&perpID),
                
                // current time
                clock::timestamp_ms(clock)
            );
            

            let tradeResponse = isolated_trading::trade(sender, perp, ordersTable, subAccounts, data, tx_index);


            // transfer margins between perp and accounts
            margin_bank::transfer_trade_margin(
                bank,
                perpAddress,
                makerAddress,
                takerAddress,
                isolated_trading::makerFundsFlow(tradeResponse),
                isolated_trading::takerFundsFlow(tradeResponse),
                tx_index
            );

            // transfer fee to fee pool from perpetual
            let fee = isolated_trading::fee(tradeResponse);
            if(fee > 0 ){
                margin_bank::transfer_margin_to_account_v2(
                    bank, 
                    perpAddress, 
                    perpetual::feePool_v2(perp), 
                    fee, 
                    2,
                    tx_index
                );
            }
    }

    /**
     * Used to perofrm liquidation trade between the liquidator and
     * an under collat account
     */ 
    entry fun liquidate<T>(
        clock: &Clock,
        perp: &mut PerpetualV2,
        bank: &mut BankV2<T>, 
        subAccounts: &SubAccountsV2,
        sequencer: &mut Sequencer,
        // pyth oracle object
        price_oracle: &PythFeeder,

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

        tx_hash: vector<u8>,

        ctx: & TxContext        

    ){

        assert!(perpetual::get_version(perp) == roles::get_version(), error::object_version_mismatch());
        assert!(margin_bank::get_version(bank) == roles::get_version(), error::object_version_mismatch());
        roles::validate_sub_accounts_version(subAccounts);
        
        let tx_index = roles::validate_unique_tx(sequencer, tx_hash);

        quantity = quantity / library::base_uint();
        leverage = leverage / library::base_uint();

        // checks that provided price oracle is correct and updates perpetual with new price
        perpetual::update_oracle_price(perp, price_oracle);

        // ensure perpetual is not delisted
        assert!(!perpetual::delisted_v2(perp), error::perpetual_is_delisted());

        // ensure trading is allowed on the perp
        assert!(perpetual::is_trading_permitted_v2(perp), error::trading_is_stopped_on_perpetual());

        // ensure trading is started
        assert!(clock::timestamp_ms(clock) > perpetual::startTime_v2(perp), error::trading_not_started());

        let sender = tx_context::sender(ctx);


        // check if caller has permission to trade on taker's behalf
        assert!(
            sender == liquidator || roles::is_sub_account_v2(subAccounts, liquidator, sender),
            error::sender_does_not_have_permission_for_account(1));


        let perpID = object::uid_to_inner(perpetual::id_v2(perp));
        let perpAddress = object::id_to_address(&perpID);

        // create liquidatee/liquidator position if not exists
        position::create_position(perpID, perpetual::positions(perp), liquidatee);
        position::create_position(perpID, perpetual::positions(perp), liquidator);

        // apply funding rate to maker
        apply_funding_rate(
            tx_index,
            bank,
            perp,
            sender,
            liquidatee,
            isolated_liquidation::tradeType(),
            0 // offset is 0 for maker
        );

        // apply funding rate to taker
        apply_funding_rate(
            tx_index,
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

        let tradeResponse = isolated_liquidation::trade(sender, perp, data, tx_index);

        // transfer premium amount between perpetual/liquidator 
        // and insurance pool

        let liqPortion = isolated_liquidation::liquidatorPortion(tradeResponse);
        let poolPortion = isolated_liquidation::insurancePoolPortion(tradeResponse);

        // if liquidator's portion is positive
        if(signed_number::gt_uint(liqPortion, 0)){
            // transfer percentage of premium to liquidator
            margin_bank::transfer_margin_to_account_v2(
                bank,
                perpAddress,
                liquidator,
                signed_number::value(liqPortion), 
                2,
                tx_index
            )
        }
        // if negative, implies under water/bankrupt liquidation
        else if(signed_number::lt_uint(liqPortion, 0)){
            // transfer negative liquidation premium from liquidator to perpetual
            margin_bank::transfer_margin_to_account_v2(
                bank,
                liquidator,
                perpAddress,
                signed_number::value(liqPortion), 
                1,
                tx_index
            )
        };

        // insurance pool portion
        if(signed_number::gt_uint(poolPortion, 0)){
            // transfer percentage of premium to insurance pool
            margin_bank::transfer_margin_to_account_v2(
                bank,
                perpAddress,
                perpetual::insurancePool_v2(perp),
                signed_number::value(poolPortion), 
                2,
                tx_index 
            )
        };

        // transfer margins between perp and accounts
        margin_bank::transfer_trade_margin(
            bank,
            perpAddress,
            liquidatee,
            liquidator,
            isolated_liquidation::makerFundsFlow(tradeResponse),
            isolated_liquidation::takerFundsFlow(tradeResponse),
            tx_index
        );
        
     }


    /**
     * Used to perofrm adl trade between an under water maker and 
     * above water taker
     */
     entry fun deleverage<T>(
        clock: &Clock,
        perp: &mut PerpetualV2, 
        bank: &mut BankV2<T>, 
        safe: &CapabilitiesSafeV2,
        sequencer: &mut Sequencer,
        cap: &DeleveragingCap,

        // price oracle object
        price_oracle: &PythFeeder,

        // below water account to be deleveraged
        maker: address,
        // taker in profit
        taker: address,        
        // quantity of trade
        quantity: u128,
        // if true, will revert if maker's position is less than the amount
        allOrNothing: bool,

        tx_hash: vector<u8>,

        // sender's context
        ctx: &TxContext
    ){

        assert!(perpetual::get_version(perp) == roles::get_version(), error::object_version_mismatch());
        assert!(margin_bank::get_version(bank) == roles::get_version(), error::object_version_mismatch());
        roles::validate_safe_version(safe);

        let tx_index = roles::validate_unique_tx(sequencer, tx_hash);

        quantity = quantity / library::base_uint();

        // checks that provided price oracle is correct and updates perpetual with new price
        perpetual::update_oracle_price(perp, price_oracle);

        // ensure perpetual is not delisted
        assert!(!perpetual::delisted_v2(perp), error::perpetual_is_delisted());

        // ensure trading is allowed on the perp
        assert!(perpetual::is_trading_permitted_v2(perp), error::trading_is_stopped_on_perpetual());

        // ensure trading is allowed on the perp
        assert!(clock::timestamp_ms(clock) > perpetual::startTime_v2(perp), error::trading_not_started());

        roles::check_delevearging_operator_validity_v2(safe, cap);

        let sender = tx_context::sender(ctx);
        let perpID = object::uid_to_inner(perpetual::id_v2(perp));
        let perpAddress = object::id_to_address(&perpID);

        // create maker/taker position if not exists
        position::create_position(perpID, perpetual::positions(perp), maker);
        position::create_position(perpID, perpetual::positions(perp), taker);


        // apply funding rate to maker
        apply_funding_rate(
            tx_index,
            bank,
            perp,
            sender,
            maker,
            isolated_adl::tradeType(),
            0 // offset is 0 for maker
        );

        // apply funding rate to taker
        apply_funding_rate(
            tx_index,
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

        let tradeResponse = isolated_adl::trade(sender, perp, data, tx_index);
        
        // transfer margins between perp and accounts
        margin_bank::transfer_trade_margin(
            bank,
            perpAddress,
            maker,
            taker,
            isolated_adl::makerFundsFlow(tradeResponse),
            isolated_adl::takerFundsFlow(tradeResponse),
            tx_index
        );

    }

    //===========================================================//
    //                       MARGIN ADJUSTMENT                   //
    //===========================================================//

    /**
     * Allows caller to add margin to their position
     */
    entry fun add_margin<T>(perp: &mut PerpetualV2, bank: &mut BankV2<T>, subAccounts: &SubAccountsV2, sequencer: &mut Sequencer, price_oracle: &PythFeeder, user:address, amount: u128, tx_hash: vector<u8>,  ctx: &TxContext){


        assert!(perpetual::get_version(perp) == roles::get_version(), error::object_version_mismatch());
        assert!(margin_bank::get_version(bank) == roles::get_version(), error::object_version_mismatch());
        roles::validate_sub_accounts_version(subAccounts);

        let tx_index = roles::validate_unique_tx(sequencer, tx_hash);

        amount = amount / library::base_uint();

        // checks that provided price oracle is correct and updates perpetual with new price
        perpetual::update_oracle_price(perp, price_oracle);
     
        let caller = tx_context::sender(ctx);

        // check if caller has permission for account
        assert!(
            caller == user || roles::is_sub_account_v2(subAccounts, user, caller),
            error::sender_does_not_have_permission_for_account(2)
            );

        // ensure perpetual is not delisted
        assert!(!perpetual::delisted_v2(perp), error::perpetual_is_delisted());
        assert!(amount > 0, error::margin_amount_must_be_greater_than_zero());

        assert!(table::contains(perpetual::positions(perp), user), error::user_has_no_position_in_table(2));


        let perpID = object::uid_to_inner(perpetual::id_v2(perp));
        let perpAddress = object::id_to_address(&perpID);

        let balance = table::borrow_mut(perpetual::positions(perp), user);

        let qPos = position::qPos(*balance);
        let margin = position::margin(*balance);

        assert!(qPos > 0, error::user_position_size_is_zero(2));

        // Transfer margin amount from user to perpetual in margin bank
        margin_bank::transfer_margin_to_account_v2(
            bank,
            user, 
            perpAddress, 
            amount,
            3,
            tx_index
        );

        // update margin of user in storage
        position::set_margin(balance, margin + amount);
        
        position::emit_position_update_event(*balance, caller, ACTION_ADD_MARGIN, tx_index);

        // user must add enough margin that can pay for its all settlement dues
        apply_funding_rate(
            tx_index,
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
    entry fun remove_margin<T>(perp: &mut PerpetualV2, bank: &mut BankV2<T>, subAccounts: &SubAccountsV2, sequencer: &mut Sequencer, price_oracle: &PythFeeder, user: address, amount: u128, tx_hash: vector<u8>, ctx: &TxContext){
        
        assert!(perpetual::get_version(perp) == roles::get_version(), error::object_version_mismatch());
        assert!(margin_bank::get_version(bank) == roles::get_version(), error::object_version_mismatch());
        roles::validate_sub_accounts_version(subAccounts);

        let tx_index = roles::validate_unique_tx(sequencer, tx_hash);

        amount = amount / library::base_uint();

        // checks that provided price oracle is correct and updates perpetual with new price
        perpetual::update_oracle_price(perp, price_oracle);

        let caller = tx_context::sender(ctx);

        // check if caller has permission for account
        assert!(
            caller == user || roles::is_sub_account_v2(subAccounts, user, caller),
            error::sender_does_not_have_permission_for_account(2)
            );

        // ensure perpetual is not delisted
        assert!(!perpetual::delisted_v2(perp), error::perpetual_is_delisted());

        assert!(amount > 0, error::margin_amount_must_be_greater_than_zero());

        let priceOracle = perpetual::priceOracle_v2(perp);

        assert!(table::contains(perpetual::positions(perp), user), error::user_has_no_position_in_table(2));

        let perpID = object::uid_to_inner(perpetual::id_v2(perp));
        let perpAddress = object::id_to_address(&perpID);

        let initBalance = *table::borrow(perpetual::positions(perp), user);
        let balance = table::borrow_mut(perpetual::positions(perp), user);

        let qPos = position::qPos(*balance);
        let margin = position::margin(*balance);

        assert!(qPos > 0, error::user_position_size_is_zero(2));


        let maxRemovableAmount = margin_math::get_max_removeable_margin(*balance, priceOracle);

        assert!(amount <= maxRemovableAmount, error::margin_must_be_less_than_max_removable_margin());
        
        // transfer margin amount from perpetual to user address in margin bank
        margin_bank::transfer_margin_to_account_v2(
            bank,
            perpAddress, 
            user, 
            amount,
            2,
            tx_index
        );


        // update margin of user in storage
        position::set_margin(balance, margin - amount);

        // user must have enough margin to pay for their settlement dues
        apply_funding_rate(
            tx_index,
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
            perpetual::imr_v2(perp), 
            perpetual::mmr_v2(perp), 
            priceOracle, 
            0, 
            0);
            
        position::emit_position_update_event(currBalance, caller, ACTION_REMOVE_MARGIN, tx_index);

    }

    /**
     * Allows caller to adjust their leverage
     */
    entry fun adjust_leverage<T>(perp: &mut PerpetualV2, bank: &mut BankV2<T>, subAccounts: &SubAccountsV2, sequencer: &mut Sequencer, price_oracle: &PythFeeder, user: address, leverage: u128, tx_hash: vector<u8>, ctx: &TxContext){
     
        assert!(perpetual::get_version(perp) == roles::get_version(), error::object_version_mismatch());
        assert!(margin_bank::get_version(bank) == roles::get_version(), error::object_version_mismatch());
        roles::validate_sub_accounts_version(subAccounts);

        let tx_index = roles::validate_unique_tx(sequencer, tx_hash);

        leverage = leverage / library::base_uint();

        // checks that provided price oracle is correct and updates perpetual with new price
        perpetual::update_oracle_price(perp, price_oracle);
        
        let caller = tx_context::sender(ctx);

        // check if caller has permission for account
        assert!(
            caller == user || roles::is_sub_account_v2(subAccounts, user, caller),
            error::sender_does_not_have_permission_for_account(2)
            );

        // ensure perpetual is not delisted
        assert!(!perpetual::delisted_v2(perp), error::perpetual_is_delisted());

        // get precise(whole number) leverage 1, 2, 3...n
        leverage = library::round_down(leverage);

        assert!(leverage > 0, error::leverage_can_not_be_set_to_zero());

        let priceOracle = perpetual::priceOracle_v2(perp);
        let tradeChecks = perpetual::checks_v2(perp);
        let perpID = object::uid_to_inner(perpetual::id_v2(perp));
        let perpAddress = object::id_to_address(&perpID);

        assert!(table::contains(perpetual::positions(perp), user), error::user_has_no_position_in_table(2));

        // user must have enough margin to pay for their settlement dues
        apply_funding_rate(
            tx_index,
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
            margin_bank::transfer_margin_to_account_v2(
                bank,
                perpAddress, 
                user, 
                margin - targetMargin,
                2,
                tx_index
            );

        } else if (margin < targetMargin) {
            // if user position has < margin than required target margin, 
            // move required margin from bank to perpetual
            margin_bank::transfer_margin_to_account_v2(
                bank,
                user, 
                perpAddress, 
                targetMargin - margin,
                3,
                tx_index
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
            perpetual::imr_v2(perp), 
            perpetual::mmr_v2(perp), 
            priceOracle, 
            0, 
            0);

        position::emit_position_update_event(currBalance, caller, ACTION_ADJUST_LEVERAGE, tx_index);
    }

    //===========================================================// 
    //                     CLOSE POSITION                        //
    //===========================================================//

    entry fun close_position<T>(perp: &mut PerpetualV2, bank: &mut BankV2<T>, sequencer: &mut Sequencer, tx_hash: vector<u8>, ctx: & TxContext){

        assert!(perpetual::get_version(perp) == roles::get_version(), error::object_version_mismatch());
        assert!(margin_bank::get_version(bank) == roles::get_version(), error::object_version_mismatch());
        let tx_index = roles::validate_unique_tx(sequencer, tx_hash);

        // ensure perpetual is delisted before users can close their position
        assert!(perpetual::delisted_v2(perp), error::perpetual_is_not_delisted());

        let user = tx_context::sender(ctx);
        
        assert!(table::contains(perpetual::positions(perp), user), error::user_has_no_position_in_table(2));
        
        let perpID = object::uid_to_inner(perpetual::id_v2(perp));
        let perpAddress = object::id_to_address(&perpID);
        let delistingPrice = perpetual::delistingPrice_v2(perp);

        apply_funding_rate(
            tx_index,
            bank,
            perp,
            user,
            user,
            0,
            2
        );      
          
        let userPos = table::borrow_mut(perpetual::positions(perp), user);
        
        assert!(position::qPos(*userPos) > 0, error::user_position_size_is_zero(2));

        let perpBalance = margin_bank::get_balance_v2(bank, perpAddress);

        // get margin to be returned to user
        let marginLeft = margin_math::get_margin_left(*userPos, delistingPrice, perpBalance);


        // set user position to zero
        position::set_qPos(userPos, 0);

        // transfer margin to user account
        margin_bank::transfer_margin_to_account_v2(
            bank,
            perpAddress, 
            user,
            marginLeft,
            2,
            tx_index
        );

        position::emit_position_closed_event(perpID, user, marginLeft, tx_index);
        position::emit_position_update_event(*userPos, user, ACTION_FINAL_WITHDRAWAL, tx_index);

    }


    //===========================================================//
    //                        FUNDING RATE                       //
    //===========================================================//

    fun apply_funding_rate<T>(tx_index:u128, bank: &mut BankV2<T>, perp: &mut PerpetualV2, caller: address, user: address, flag: u8, offset:u64){
        
        let perpID = object::uid_to_inner(perpetual::id_v2(perp));
        let perpAddress = object::id_to_address(&perpID);

        // oracle price
        let price = perpetual::priceOracle_v2(perp);

        let fundingRate = perpetual::fundingRate_v2(perp);

        // get perp global index
        let globalIndex = funding_rate::index(fundingRate);

        let userPos = table::borrow_mut(perpetual::positions(perp), user);

        // get user's local index
        let localIndex = position::index(*userPos);
        let margin = position::margin(*userPos);
        let qPos = position::qPos(*userPos);
        let oiOpen = position::oiOpen(*userPos);
        let isPosPositive = position::isPosPositive(*userPos);

        // update user index to global index
        position::set_index(userPos, globalIndex);

         // If timestamp didn't change, index doesn't change or qpos is zero
        if (funding_rate::are_indexes_equal(localIndex, globalIndex) || qPos == 0){
            return
        };

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
                    margin_bank::transfer_margin_to_account_v2(
                        bank,
                        caller, 
                        perpAddress, 
                        amount,
                        1, // taker is transferring amount (as caller is the taker/liquidator in liquidaiton trade)
                        tx_index
                    );

                    emit(LiquidatorPaidForAccountSettlementEvnetV2{
                        tx_index,
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
                            emit(SettlementAmountNotPaidCompletelyEventV2{
                                tx_index,
                                account: user,
                                amount: settlementAmount - oiOpen
                            });
                        } else {
                            position::set_oiOpen(userPos, oiOpen - settlementAmount);
                        };

                    };

                    emit(SettlementAmtDueByMakerEventV2{
                        tx_index,
                        account:user, 
                        amount: settlementAmount
                        });

                    settlementAmount = 0;
                };
            };

            // reduce user's margin by settlement amount
            position::set_margin(userPos, margin - settlementAmount);

        };

       
        emit(AccountSettlementUpdateEventV2{
            tx_index,
            account: user,
            balance: *userPos,
            settlementIsPositive: signed_number::sign(indexDiff),
            settlementAmount,
            price,
            fundingRate: funding_rate::rate(fundingRate)
        });

    }  

}
