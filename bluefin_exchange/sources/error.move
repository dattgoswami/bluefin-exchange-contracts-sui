module bluefin_exchange::error {

    // Setter Errors
    public fun min_price_greater_than_zero() : u64 {
        return 1
    }

    public fun min_price_less_than_max_price() : u64 {
        return 2
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

    // Trade Errors
    public fun trade_price_less_than_min_price() : u64 {
        return 3
    }

    public fun trade_price_greater_than_max_price() : u64 {
        return  4
    }

    public fun trade_price_tick_size_not_allowed() : u64 {
        return  5
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
        return  22
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

    public fun order_was_already_canceled(isTakerInvalid : u64) : u64 {
        return isTakerInvalid + 28
    }

    public fun order_has_invalid_signature(isTakerInvalid : u64) : u64 {
        return isTakerInvalid + 30
    }

    public fun order_has_expired(isTakerInvalid : u64) : u64 {
        return isTakerInvalid + 32
    }

    public fun fill_price_invalid(isTakerInvalid : u64) : u64 {
        return isTakerInvalid + 34
    }

    public fun trigger_price_not_reached(isTakerInvalid : u64) : u64 {
        return isTakerInvalid + 36
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
        return 47
    }

    // Operator errors
    public fun sender_has_no_taker_permission() : u64 {
        return 27
    }

    public fun user_already_has_position() : u64 {
        return 6
    }

    public fun operator_already_whitelisted_for_settlement() : u64 {
        return 7
    }

    public fun operator_not_found() : u64 {
        return 8
    }

    public fun not_valid_price_oracle_operator() : u64 {
        return 100
    }

    public fun already_price_oracle_operator() : u64 {
        return 101
    }

    public fun out_of_max_allowed_price_diff_bounds() : u64 {
        return 102
    }

    public fun max_allowed_price_diff_cannot_be_zero() : u64 {
        return 103
    }

    public fun invalid_price_oracle_capability() : u64 {
        return 104
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

    public fun user_has_no_position_in_table(): u64 {
        return 501
    }

    public fun user_position_size_is_zero(): u64 {
        return 502
    }

    public fun margin_must_be_less_than_max_removable_margin(): u64 {
        return 503
    }

    public fun leverage_can_not_be_set_to_zero(): u64 {
        return 504
    }
}