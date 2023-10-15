module bluefin_foundation::error {

    // Setter Errors
    public fun min_price_greater_than_zero() : u64 {
        return 1
    }

    public fun min_price_less_than_max_price() : u64 {
        return 2
    } 

    public fun trade_price_less_than_min_price() : u64 {
        return 3
    }

    public fun trade_price_greater_than_max_price() : u64 {
        return  4
    }

    public fun trade_price_tick_size_not_allowed() : u64 {
        return  5
    }

    public fun user_already_has_position() : u64 {
        return 6
    }

    public fun operator_not_found() : u64 {
        return 8
    }

    public fun max_price_greater_than_min_price() : u64 {
        return 9
    }

    public fun step_size_greater_than_zero() : u64 {
        return 10
    }

    public fun tick_size_greater_than_zero() : u64 {
        return 11
    }

    public fun mtb_long_greater_than_zero() : u64 {
        return 12
    }

    public fun mtb_short_greater_than_zero() : u64 {
        return 13
    }

    public fun mtb_short_less_than_hundred_percent() : u64 {
        return 14
    }

    public fun max_limit_qty_greater_than_min_qty() : u64 {
        return 15
    }

    public fun max_market_qty_less_than_min_qty() : u64 {
        return 16
    }

    public fun min_qty_less_than_max_qty() : u64 {
        return 17
    }

    public fun min_qty_greater_than_zero() : u64 {
        return 18
    }

    public fun trade_qty_less_than_min_qty() : u64 {
        return 19
    }

    public fun trade_qty_greater_than_limit_qty() : u64 {
        return 20
    }

    public fun trade_qty_greater_than_market_qty() : u64 {
        return 21
    }

    public fun trade_qty_step_size_not_allowed( ) : u64 {
        return 22
    }

    public fun trade_price_greater_than_mtb_long() : u64 {
        return 23
    }

    public fun trade_price_greater_than_mtb_short() : u64 {
        return 24
    }

    public fun oi_open_greater_than_max_allowed( isTakerInvalid : u64 ) : u64 {
        return isTakerInvalid + 25
    }

    public fun order_is_canceled(isTakerInvalid : u64) : u64 {
        return isTakerInvalid + 28
    }

    public fun order_has_invalid_signature(isTakerInvalid : u64) : u64 {
        return isTakerInvalid + 30
    }

    public fun order_expired(isTakerInvalid : u64) : u64 {
        return isTakerInvalid + 32
    }

    public fun fill_price_invalid(isTakerInvalid : u64) : u64 {
        return isTakerInvalid + 34
    }

    public fun fill_does_not_decrease_size(isTakerInvalid : u64) : u64 {
        return isTakerInvalid + 38
    }

    public fun invalid_leverage(isTakerInvalid : u64) : u64 {
        return isTakerInvalid + 40
    }

    public fun leverage_must_be_greater_than_zero(isTakerInvalid : u64) : u64 {
        return isTakerInvalid + 42
    }

    public fun cannot_overfill_order(isTakerInvalid : u64) : u64 {
        return isTakerInvalid + 44
    }

    public fun loss_exceeds_margin(isTakerInvalid : u64) : u64 {
        return isTakerInvalid + 46
    }

    public fun order_cannot_be_of_same_side() : u64 {
        return 48
    }

    public fun taker_order_can_not_be_post_only() : u64 {
        return 49
    }

    public fun sender_does_not_have_permission_for_account(offset: u64): u64 {
       
        // 50 + 0 = 50 for maker
        // 50 + 1 = 51 for taker
        // 50 + 2 = 52 for user
        return 50 + offset
    }

    public fun funding_due_exceeds_margin(offset: u64): u64 {
        // 53 + 0 = 53 for maker
        // 53 + 1 = 54 for taker
        // 53 + 2 = 55 for user
        return 53 + offset
    }

    public fun trading_not_started(): u64 {
        return 56
    }

    public fun perpetual_has_been_already_de_listed(): u64 {
        return 60
    }

    public fun perpetual_is_delisted(): u64 {
        return 61
    }

    public fun perpetual_is_not_delisted(): u64 {
        return 62
    }

    public fun trading_is_stopped_on_perpetual(): u64 {
        return 63
    }

    public fun invalid_price_oracle_operator() : u64 {
        return 100
    }

    public fun invalid_funding_rate_operator() : u64 {
        return 101
    }

    public fun out_of_max_allowed_price_diff_bounds() : u64 {
        return 102
    }

    public fun max_allowed_price_diff_cannot_be_zero() : u64 {
        return 103
    }

    public fun can_not_be_greater_than_hundred_percent() : u64 {
        return 104
    }

    public fun address_cannot_be_zero() : u64 {
        return 105
    }

    public fun maker_order_can_not_be_ioc() : u64 {
        return 106
    }

    public fun coin_does_not_have_enough_amount() : u64 {
        return 107
    }

    public fun only_taker_of_trade_can_execute_trade_involving_non_orderbook_orders(): u64 {
        return 108
    }

    public fun not_a_public_settlement_cap() : u64 {
        return 109
    }

    public fun invalid_settlement_operator() : u64 {
        return 110
    }

    public fun invalid_guardian() : u64 {
        return 111
    }

    public fun operator_already_removed() : u64 {
        return 112
    }

    public fun invalid_deleveraging_operator(): u64{
        return 113
    }

    public fun maintenance_margin_must_be_greater_than_zero(): u64{
        return 300
    }

    public fun maintenance_margin_must_be_less_than_or_equal_to_imr(): u64{
        return 301
    }

    public fun initial_margin_must_be_greater_than_or_equal_to_mmr(): u64{
        return 302
    }

    public fun mr_less_than_imr_can_not_open_or_flip_position(isTaker: u64): u64 {
        return 400 + isTaker
    }

    public fun mr_less_than_imr_mr_must_improve(isTaker: u64): u64 {
        return 402 + isTaker
    }

    public fun mr_less_than_imr_position_can_only_reduce(isTaker: u64): u64 {
        return 404 + isTaker
    }

    public fun mr_less_than_zero(isTaker: u64): u64 {
        return 406 + isTaker
    }


    public fun margin_amount_must_be_greater_than_zero(): u64 {
        return 500
    }


    public fun margin_must_be_less_than_max_removable_margin(): u64 {
        return 503
    }

    public fun leverage_can_not_be_set_to_zero(): u64 {
        return 504
    }

    public fun user_has_no_position_in_table(offset: u64): u64 {
        return 505 + offset
    }

    public fun user_position_size_is_zero(offset: u64): u64 {
        return 510 + offset
    }

    // Margin Bank errors
    public fun not_enough_balance_in_margin_bank(offset: u64) : u64 {

        // 600 + 0 = 600 for maker
        // 600 + 1 = 601 for taker
        // 600 + 2 = 602 for perpetual
        // 600 + 3 = 603 for normal withdrawal & deposit

        return 600 + offset
    }

    public fun withdrawal_is_not_allowed() : u64 {
        return 604
    }

    public fun user_has_no_bank_account() : u64 {
        return 605
    }

    public fun provided_coin_do_not_have_enough_amount() : u64 {
        return 606
    }


    public fun liquidation_all_or_nothing_constraint_not_held() : u64 {
        return 701
    }

    public fun invalid_liquidator_leverage() : u64 {
        return 702
    }

    public fun liquidatee_above_mmr(): u64 {
        return 703
    }

    public fun maker_is_not_underwater(): u64 {
        return 800
    }

    public fun taker_is_under_underwater(): u64 {
        return 801
    }

    public fun maker_taker_must_have_opposite_side_positions(): u64 {
        return 802
    }

    public fun adl_all_or_nothing_constraint_can_not_be_held(isTaker:u64): u64 {
        return 803 + isTaker
    }


    public fun new_address_can_not_be_same_as_current_one(): u64 {
        return 900
    }

    public fun funding_rate_can_not_be_set_for_zeroth_window(): u64 {
        return 901
    }

    public fun funding_rate_for_window_already_set(): u64 {
        return 902
    }

    public fun wrong_price_identifier(): u64{
        return 903
    }

    
    public fun greater_than_max_allowed_funding(): u64 {
        return 904
    }

    public fun object_version_mismatch(): u64 {
        return 905
    }


    public fun transaction_replay(): u64 {
        return 906
    }
    
}