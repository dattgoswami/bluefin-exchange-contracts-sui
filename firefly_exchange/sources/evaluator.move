module firefly_exchange::evaluator {

    /**
     * verifies that price conforms to min/max price checks 
     * @dev reversion implies maker order is at fault
     */
    public fun verifyMinMaxPrice(price: u64, minPrice: u64, maxPrice: u64){
        assert!(price >= minPrice, 3);
        assert!(price <= maxPrice, 4);
    }


    /**
     * verifies if the trade price conforms to min/max price and tick size 
     * @dev reversion implies maker order is at fault
     */
    public fun verifyTickSize(price: u64, tickSize: u64){
        assert!(price % tickSize == 0, 5);
    }

}