module bluefin_foundation::price_oracle {

    use sui::object::{ID};
    use sui::event::{emit};

    // custom
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::library::{base_uint};
    use bluefin_foundation::roles::{Self, CapabilitiesSafe, PriceOracleOperatorCap};

    // friend module
    friend bluefin_foundation::perpetual;

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct OraclePriceUpdateEvent has copy, drop {
        id: ID,
        price: u128,
        updatedAt: u64,
    }

    struct MaxAllowedPriceDiffUpdateEvent has copy, drop {
        id: ID, 
        maxAllowedPriceDifference: u128
    }


    //===========================================================//
    //                           STORAGE                         //
    //===========================================================//


    struct PriceOracle has copy, drop, store {
        // price 
        price: u128,
        // timestamp at which price was updated
        updatedAt: u64,
        // maximum allowed difference between 2 consecutive prices
        maxAllowedPriceDifference: u128
    }

    //===========================================================//
    //                      FRIEND FUNCTIONS                     //
    //===========================================================//

    public (friend) fun initialize(
       perp: ID,
       maxAllowedPriceDifference: u128, 
    ): PriceOracle {
        
        let oracle = PriceOracle {
            price:0,
            maxAllowedPriceDifference,
            // to do set current time
            updatedAt: 0
        };

        emit(OraclePriceUpdateEvent { 
            id: perp,
            price: 0,
            updatedAt: 0 // to do set current time
        });

        emit(MaxAllowedPriceDiffUpdateEvent { 
            id: perp,
            maxAllowedPriceDifference
        });

        return oracle
    }
    
    public (friend) fun set_oracle_price_max_allowed_diff(perp: ID, op: &mut PriceOracle, maxAllowedPriceDifference: u128){
        assert!(maxAllowedPriceDifference != 0, error::max_allowed_price_diff_cannot_be_zero());

        op.maxAllowedPriceDifference = maxAllowedPriceDifference;

        emit(MaxAllowedPriceDiffUpdateEvent{ 
            id: perp,
            maxAllowedPriceDifference
        });
    }
    
    public (friend) fun set_oracle_price(safe: &CapabilitiesSafe, cap: &PriceOracleOperatorCap, op: &mut PriceOracle, perp: ID, price: u128, timestamp: u64){
        
        roles::check_price_oracle_operator_validity(safe, cap);
        
        assert!(
            verify_oracle_price_update_diff(op.maxAllowedPriceDifference, price, op.price), 
            error::out_of_max_allowed_price_diff_bounds());

        op.price = price;
        op.updatedAt = timestamp;
        emit(OraclePriceUpdateEvent { 
            id: perp,
            price, 
            updatedAt: timestamp
        });
    }

    //===========================================================//
    //                          ACCESSORS                        //
    //===========================================================//

    public fun price(op: PriceOracle): u128 {
        return op.price
    }

    //===========================================================//
    //                         HELPERS                           //
    //===========================================================//

    fun verify_oracle_price_update_diff(maxPriceUpdateDiff:u128, newPrice: u128, oldPrice: u128): bool {

        // @dev This is case where intially oraclePrice is not set against a Market.
        if (oldPrice == 0) {
            return true
        };

        let diff;
        if(newPrice > oldPrice){
            diff = newPrice - oldPrice;
        }else{
            diff = oldPrice - newPrice;
        };

        let percentDiff = (diff * base_uint()) /  oldPrice;

        if (percentDiff > maxPriceUpdateDiff) {
            return false
        };

        return true
    }
}