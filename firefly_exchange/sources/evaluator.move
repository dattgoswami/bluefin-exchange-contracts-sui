module firefly_exchange::evaluator {

    use sui::object::{ID};
    use sui::event::{emit};
    use firefly_exchange::library::{base_uint};

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct MinOrderPriceUpdateEvent has copy, drop {
        id: ID,
        price: u64
    }

    struct MaxOrderPriceUpdateEvent has copy , drop {
        id: ID,
        price : u64
    }

    struct StepSizeUpdateEvent has copy, drop {
        id: ID,
        size : u64
    }

    struct TickSizeUpdateEvent has copy, drop {
        id: ID,
        size : u64
    }

    struct MtbLongUpdateEvent has copy , drop {
        id: ID,
        mtb : u64
    }

    struct MtbShortUpdateEvent has copy , drop {
        id: ID,
        mtb : u64
    }

    struct MaxQtyLimitUpdateEvent has copy , drop {
        id: ID,
        qty: u64
    }

    struct MaxQtyMarketUpdateEvent has copy , drop {
        id: ID, 
        qty: u64
    }

    struct MinQtyUpdateEvent has copy , drop {
        id: ID,
        qty : u64
    }

    struct TradeChecks has copy, drop, store {
        /// min price at which asset can be traded
        minPrice: u64,
        /// max price at which asset can be traded
        maxPrice: u64,
        /// the smallest decimal unit supported by asset for price
        tickSize: u64,
        /// minimum quantity of asset that can be traded
        minQty: u64,
        /// maximum quantity of asset that can be traded for limit order
        maxQtyLimit: u64,
        /// maximum quantity of asset that can be traded for market order
        maxQtyMarket: u64,
        /// the smallest decimal unit supported by asset for quantity
        stepSize: u64,
        ///  market take bound for long side ( 10% == 100000000000000000)
        mtbLong: u64,
        ///  market take bound for short side ( 10% == 100000000000000000)
        mtbShort: u64,
    }

    public fun initTradeChecks(
        minPrice: u64,
        maxPrice: u64,
        tickSize: u64,
        minQty: u64,
        maxQtyLimit: u64,
        maxQtyMarket: u64,
        stepSize: u64,
        mtbLong: u64,
        mtbShort: u64,
    ): TradeChecks {

        let tradeChecks = TradeChecks {
            minPrice,
            maxPrice,
            tickSize,
            minQty,
            maxQtyLimit,
            maxQtyMarket,
            stepSize,
            mtbLong,
            mtbShort
        };

        verifyPreInitChecks(tradeChecks);


        return tradeChecks
    }

    //===========================================================//
    //                      SETTER METHODS
    //===========================================================//


    public fun setMinPrice( perp: ID, checks: &mut TradeChecks, minPrice: u64){
        
        assert!(minPrice > 0, 1);
        assert!(minPrice < checks.maxPrice, 2);        
        checks.minPrice = minPrice;

        emit(MinOrderPriceUpdateEvent{
            id: perp,
            price: minPrice
        })
    }   

    public fun setMaxPrice( perp: ID, checks: &mut TradeChecks, maxPrice: u64){
        
        assert!(maxPrice > checks.minPrice, 9);      
        checks.maxPrice = maxPrice;

        emit(MaxOrderPriceUpdateEvent{
            id: perp,
            price: maxPrice
        })
    }

    public fun setStepSize( perp: ID, checks: &mut TradeChecks, stepSize: u64){
        
        assert!(stepSize > 0, 10);      
        checks.stepSize = stepSize;

        emit(StepSizeUpdateEvent{
            id: perp,
            size: stepSize
        })
    }

    public fun setTickSize( perp: ID, checks: &mut TradeChecks, tickSize: u64){
        
        assert!(tickSize > 0, 11);      
        checks.tickSize = tickSize;

        emit(TickSizeUpdateEvent{
            id: perp,
            size: tickSize
        })
    }

    public fun setMtbLong( perp: ID, checks: &mut TradeChecks, value: u64){
        
        assert!(value > 0, 12);      
        checks.mtbLong = value;

        emit(MtbLongUpdateEvent{
            id: perp,
            mtb: value
        })
    }

    public fun setMtbShort( perp: ID, checks: &mut TradeChecks, value: u64){
        assert!(value > 0, 13);
        assert!(value < base_uint(), 14);      
        checks.mtbShort = value;

        emit(MtbShortUpdateEvent{
            id: perp,
            mtb: value
        })
    }

    public fun setMaxQtyLimit( perp: ID, checks: &mut TradeChecks, quantity: u64){
        
        assert!(quantity > checks.minQty, 15);      
        checks.maxQtyLimit = quantity;

        emit(MaxQtyLimitUpdateEvent{
            id: perp,
            qty: quantity
        })
    }

    public fun setMaxQtyMarket( perp: ID, checks: &mut TradeChecks, quantity: u64){
        
        assert!(quantity > checks.minQty, 16);      
        checks.maxQtyMarket = quantity;

        emit(MaxQtyMarketUpdateEvent{
            id: perp,
            qty: quantity
        })
    }

    public fun setMinQty( perp: ID, checks: &mut TradeChecks, quantity: u64){
        
        assert!(quantity < checks.maxQtyLimit && quantity < checks.maxQtyMarket, 17);
        assert!(quantity > 0, 18);
        checks.minQty = quantity;

        emit(MinQtyUpdateEvent{
            id: perp,
            qty: quantity
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
        assert!(checks.minPrice > 0, 1);
        assert!(checks.minPrice < checks.maxPrice, 2);
        assert!(checks.maxPrice > checks.minPrice, 9);
        assert!(checks.stepSize > 0, 10);
        assert!(checks.tickSize > 0, 11);
        assert!(checks.mtbLong > 0, 12);
        assert!(checks.mtbShort > 0, 13);
        assert!(checks.mtbShort < base_uint(), 14); 
        assert!(checks.maxQtyLimit > checks.minQty, 15);
        assert!(checks.maxQtyMarket > checks.minQty, 16); 
        assert!(checks.minQty < checks.maxQtyLimit && checks.minQty < checks.maxQtyMarket, 17);
        assert!(checks.minQty > 0, 18);
    }

    /**
     * verifies that price conforms to min/max price checks 
     * @dev reversion implies maker order is at fault
     */
    public fun verifyMinMaxPrice(checks: TradeChecks, price: u64){
        assert!(price >= checks.minPrice, 3);
        assert!(price <= checks.maxPrice, 4);
    }


    /**
     * verifies if the trade price conforms to min/max price and tick size 
     * @dev reversion implies maker order is at fault
     */
    public fun verifyTickSize(checks: TradeChecks, price: u64){
        assert!(price % checks.tickSize == 0, 5);
    }

}