module firefly_exchange::evaluator {

    use sui::object::{ID};
    use sui::event::{emit};
    use std::vector;
    use firefly_exchange::library::{Self};
    use firefly_exchange::error::{Self};


    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct MinOrderPriceUpdateEvent has copy, drop {
        id: ID,
        price: u128
    }

    struct MaxOrderPriceUpdateEvent has copy , drop {
        id: ID,
        price : u128
    }

    struct StepSizeUpdateEvent has copy, drop {
        id: ID,
        size : u128
    }

    struct TickSizeUpdateEvent has copy, drop {
        id: ID,
        size : u128
    }

    struct MtbLongUpdateEvent has copy , drop {
        id: ID,
        mtb : u128
    }

    struct MtbShortUpdateEvent has copy , drop {
        id: ID,
        mtb : u128
    }

    struct MaxQtyLimitUpdateEvent has copy , drop {
        id: ID,
        qty: u128
    }

    struct MaxQtyMarketUpdateEvent has copy , drop {
        id: ID, 
        qty: u128
    }

    struct MinQtyUpdateEvent has copy , drop {
        id: ID,
        qty : u128
    }

    struct MaxAllowedOIOpenUpdateEvent has copy, drop {
        id: ID,
        maxAllowedOIOpen : vector<u128>
    }

    struct TradeChecks has copy, drop, store {
        /// min price at which asset can be traded
        minPrice: u128,
        /// max price at which asset can be traded
        maxPrice: u128,
        /// the smallest decimal unit supported by asset for price
        tickSize: u128,
        /// minimum quantity of asset that can be traded
        minQty: u128,
        /// maximum quantity of asset that can be traded for limit order
        maxQtyLimit: u128,
        /// maximum quantity of asset that can be traded for market order
        maxQtyMarket: u128,
        /// the smallest decimal unit supported by asset for quantity
        stepSize: u128,
        ///  market take bound for long side ( 10% == 100000000000000000)
        mtbLong: u128,
        ///  market take bound for short side ( 10% == 100000000000000000)
        mtbShort: u128,
        /// vector for maximum OI Open allowed for leverage. Indexes represent leverage
        maxAllowedOIOpen : vector<u128>
    }

    public fun initTradeChecks(
        minPrice: u128,
        maxPrice: u128,
        tickSize: u128,
        minQty: u128,
        maxQtyLimit: u128,
        maxQtyMarket: u128,
        stepSize: u128,
        mtbLong: u128,
        mtbShort: u128,
        maxOILimit: vector<u128>
    ): TradeChecks {
        let maxAllowedOIOpen : vector<u128> = vector::empty();
        // Push dummy value at index 0 because leverage starts at 1
        vector::push_back(&mut maxAllowedOIOpen, 0);
        vector::append(&mut maxAllowedOIOpen, maxOILimit);

        let tradeChecks = TradeChecks {
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
        };

        verifyPreInitChecks(tradeChecks);


        return tradeChecks
    }

    //===========================================================//
    //                      SETTER METHODS
    //===========================================================//


    public fun set_min_price( perp: ID, checks: &mut TradeChecks, minPrice: u128){
        
        assert!(minPrice > 0, error::min_price_greater_than_zero());
        assert!(minPrice < checks.maxPrice, error::min_price_less_than_max_price());        
        checks.minPrice = minPrice;

        emit(MinOrderPriceUpdateEvent{
            id: perp,
            price: minPrice
        })
    }   

    public fun set_max_price( perp: ID, checks: &mut TradeChecks, maxPrice: u128){
        
        assert!(maxPrice > checks.minPrice, error::max_price_greater_than_min_price());      
        checks.maxPrice = maxPrice;

        emit(MaxOrderPriceUpdateEvent{
            id: perp,
            price: maxPrice
        })
    }

    public fun set_step_size( perp: ID, checks: &mut TradeChecks, stepSize: u128){
        
        assert!(stepSize > 0, error::step_size_greater_than_zero());      
        checks.stepSize = stepSize;

        emit(StepSizeUpdateEvent{
            id: perp,
            size: stepSize
        })
    }

    public fun set_tick_size( perp: ID, checks: &mut TradeChecks, tickSize: u128){
        
        assert!(tickSize > 0, error::tick_size_greater_than_zero());      
        checks.tickSize = tickSize;

        emit(TickSizeUpdateEvent{
            id: perp,
            size: tickSize
        })
    }

    public fun set_mtb_long( perp: ID, checks: &mut TradeChecks, value: u128){
        
        assert!(value > 0, error::mtb_long_greater_than_zero());      
        checks.mtbLong = value;

        emit(MtbLongUpdateEvent{
            id: perp,
            mtb: value
        })
    }

    public fun set_mtb_short( perp: ID, checks: &mut TradeChecks, value: u128){
        assert!(value > 0, 13);
        assert!(value < library::base_uint(), 14);      
        checks.mtbShort = value;

        emit(MtbShortUpdateEvent{
            id: perp,
            mtb: value
        })
    }

    public fun set_max_qty_limit( perp: ID, checks: &mut TradeChecks, quantity: u128){
        
        assert!(quantity > checks.minQty, error::max_limit_qty_greater_than_min_qty());      
        checks.maxQtyLimit = quantity;

        emit(MaxQtyLimitUpdateEvent{
            id: perp,
            qty: quantity
        })
    }

    public fun set_max_qty_market( perp: ID, checks: &mut TradeChecks, quantity: u128){
        
        assert!(quantity > checks.minQty, error::max_market_qty_less_than_min_qty());      
        checks.maxQtyMarket = quantity;

        emit(MaxQtyMarketUpdateEvent{
            id: perp,
            qty: quantity
        })
    }

    public fun set_min_qty( perp: ID, checks: &mut TradeChecks, quantity: u128){
        
        assert!(quantity < checks.maxQtyLimit && quantity < checks.maxQtyMarket, error::min_qty_less_than_max_qty());
        assert!(quantity > 0, error::min_qty_greater_than_zero());
        checks.minQty = quantity;

        emit(MinQtyUpdateEvent{
            id: perp,
            qty: quantity
        })
    }

    public fun set_max_oi_open( perp:ID, checks: &mut TradeChecks, maxLimit : vector<u128>){
         let maxAllowedOIOpen : vector<u128> = vector::empty();
        // Push dummy value at index 0 because leverage starts at 1
        vector::push_back(&mut maxAllowedOIOpen, 0);
        vector::append(&mut maxAllowedOIOpen, maxLimit);

        checks.maxAllowedOIOpen = maxAllowedOIOpen;
        emit(MaxAllowedOIOpenUpdateEvent{
            id: perp,
            maxAllowedOIOpen
        })
    }
    

    //===========================================================//
    //                      VERIFIER METHODS
    //===========================================================//

    /**
     * @dev internal function that verifies all pre initialization checks
     */
    fun verifyPreInitChecks(checks: TradeChecks)
    {
        assert!(checks.minPrice > 0, error::min_price_greater_than_zero());
        assert!(checks.minPrice < checks.maxPrice, error::min_price_less_than_max_price());
        assert!(checks.maxPrice > checks.minPrice, error::max_price_greater_than_min_price());
        assert!(checks.stepSize > 0, error::step_size_greater_than_zero());
        assert!(checks.tickSize > 0, error::tick_size_greater_than_zero());
        assert!(checks.mtbLong > 0, error::mtb_long_greater_than_zero());
        assert!(checks.mtbShort > 0, error::mtb_short_greater_than_zero());
        assert!(checks.mtbShort < library::base_uint(), error::mtb_short_less_than_hundred_percent()); 
        assert!(checks.maxQtyLimit > checks.minQty, error::max_limit_qty_greater_than_min_qty());
        assert!(checks.maxQtyMarket > checks.minQty, error::max_market_qty_less_than_min_qty()); 
        assert!(checks.minQty < checks.maxQtyLimit && checks.minQty < checks.maxQtyMarket, error::min_qty_less_than_max_qty());
        assert!(checks.minQty > 0, error::min_qty_greater_than_zero());
    }

    /**
     * verifies that price conforms to min/max price checks 
     * @dev reversion implies maker order is at fault
     */
    public fun verify_min_max_price(checks: TradeChecks, price: u128 ){
        assert!(price >= checks.minPrice, error::trade_price_less_than_min_price());
        assert!(price <= checks.maxPrice, error::trade_price_greater_than_max_price());
    }


    /**
     * verifies if the trade price conforms to tick size 
     * @dev reversion implies maker order is at fault
     */
    public fun verify_tick_size(checks: TradeChecks, price: u128){
        assert!(price % checks.tickSize == 0, error::trade_price_tick_size_not_allowed());
    }

    /**
     * verifies that price conforms to all the price checks 
     * @dev reversion implies maker order is at fault
     */
    public fun verify_price_checks(checks: TradeChecks, price: u128){
        verify_min_max_price(checks,price);
        verify_tick_size(checks,price);
    }

    /**
     * verifies that quantity conforms to min/max quantity checks 
     * @dev reversion implies maker order is at fault
     */
    public fun verify_min_max_qty_checks(checks: TradeChecks, qty: u128){
        assert!(qty >= checks.minQty,error::trade_qty_less_than_min_qty());
        assert!(qty <= checks.maxQtyLimit, error::trade_qty_greater_than_limit_qty());
        assert!(qty <= checks.maxQtyMarket, error::trade_qty_greater_than_market_qty());
    }

    /**
     * verifies that quantity conforms to step size 
     * @dev reversion implies maker order is at fault
     */
    public fun verify_step_size(checks: TradeChecks, qty: u128){
        assert!(qty % checks.stepSize == 0, error::trade_qty_step_size_not_allowed());
    }

    /**
     * verifies that quantity conforms to all quantity checks
     * @dev reversion implies maker order is at fault
     */
    public fun verify_qty_checks(checks: TradeChecks, qty: u128){
        verify_min_max_qty_checks(checks, qty);
        verify_step_size(checks,qty);
    }

    /**
     * verifies if the trade price for both long and short parties confirms to market take bound checks
     * @dev reversion implies taker order is at fault
     */
    public fun verify_market_take_bound_checks(
        checks: TradeChecks,
        tradePrice: u128,
        oraclePrice: u128,
        isBuy: bool
    ) {
        if(isBuy){
            assert!(tradePrice <= (oraclePrice + library::base_mul(oraclePrice,checks.mtbLong)),error::trade_price_greater_than_mtb_long());
        }
        else {
            assert!(tradePrice >= (oraclePrice + library::base_mul(oraclePrice,checks.mtbShort)),error::trade_price_greater_than_mtb_short());
        };
    }

    /**
     * @dev verifies if the account has oi open <= maximum allowed oi open for current leverage
     */
    public fun verify_oi_open_for_account( checks: TradeChecks, mro : u128, oiOpen : u128, isTaker: u64 ) {
        let leverage = library::base_div(library::base_uint(), mro); 
        let remainder = leverage % library::base_uint();

        if(remainder > library::half_base_uint()) {
            leverage = library::ceil(leverage, library::base_uint());
        } else {
            leverage = (leverage / library::base_uint()) * library::base_uint();
        };

        leverage  = leverage / library::base_uint();
    
        if((leverage as u64) > vector::length(&checks.maxAllowedOIOpen))
        {
            return
        };

        let maxAllowedOIOpen : u128 = *(vector::borrow(&checks.maxAllowedOIOpen,(leverage as u64)));

        assert!( oiOpen <= maxAllowedOIOpen, error::oi_open_greater_than_max_allowed(isTaker) ); 
    }

}