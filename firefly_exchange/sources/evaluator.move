module firefly_exchange::evaluator {

    use sui::object::{ID};
    use sui::event::{emit};

    struct MinOrderPriceUpdateEvent has copy, drop {
        id: ID,
        price: u64
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

        // TODO perform assertions on remaining variables
        assert!(minPrice > 0, 1);
        assert!(minPrice < maxPrice, 2);        

        return TradeChecks {
            minPrice,
            maxPrice,
            tickSize,
            minQty,
            maxQtyLimit,
            maxQtyMarket,
            stepSize,
            mtbLong,
            mtbShort
        }
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


    //===========================================================//
    //                      VERIFIER METHODS
    //===========================================================//

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