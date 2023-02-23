module bluefin_exchange::price_oracle {

    use sui::object::{Self, ID, UID};
    use sui::event::{emit};
    use sui::tx_context::{TxContext};
    use sui::transfer;

    use bluefin_exchange::error::{Self};
    use bluefin_exchange::library::{base_uint};

    struct OraclePriceUpdated has copy, drop {
        id: ID,
        price: u128,
        updatedAt: u128,
    }

    struct PriceOracleOperatorUpdatedEvent has copy, drop {
        id: ID, 
        account:address
    }

    struct MaxAllowedPriceDiffInOraclePriceUpdated has copy, drop {
        id: ID, 
        maxAllowedPriceDifference: u128
    }


    struct UpdateOraclePriceCapability has key {
        id: UID,
        account: address,
        perpetualID: ID
    }

    struct OraclePrice has copy, drop, store {
        
        // timestamp at which price was updated
        updatedAt: u128,

        // price 
        price: u128,

        // maximum allowed difference between 2 consecutive prices
        maxAllowedPriceDifference: u128
    }

    public fun initOraclePrice(
       price: u128, 
       maxAllowedPriceDifference: u128, 
       updatedAt: u128,
       perp: ID,
       operator: address,
        ctx: &mut TxContext
    ): OraclePrice {
        
        let op = OraclePrice {
            price,
            maxAllowedPriceDifference,
            updatedAt
        };

        emit(OraclePriceUpdated { 
            id: perp,
            price,
            updatedAt
        });

        emit(MaxAllowedPriceDiffInOraclePriceUpdated { 
            id: perp,
            maxAllowedPriceDifference
        });

        emit(PriceOracleOperatorUpdatedEvent{ 
            id: perp,
            account: operator 
        });

        let uopCapability = UpdateOraclePriceCapability {
            id: object::new(ctx),
            account: operator,
            perpetualID: perp
        };
        
        transfer::share_object(uopCapability);
        return op
    }

    public fun set_price_oracle_operator(perp: ID, cap: &mut UpdateOraclePriceCapability, operator: address){
        assert!(cap.account != operator, error::already_price_oracle_operator());
        assert!(cap.perpetualID == perp, error::invalid_price_oracle_capability());
        cap.account = operator;

        emit(PriceOracleOperatorUpdatedEvent{ 
            id: perp,
            account: operator 
        });
    }
    
    public fun set_oracle_price_max_allowed_diff(perp: ID, op: &mut OraclePrice, maxAllowedPriceDifference: u128){
        assert!(maxAllowedPriceDifference != 0, 103);
        op.maxAllowedPriceDifference = maxAllowedPriceDifference;
        emit(MaxAllowedPriceDiffInOraclePriceUpdated{ 
            id: perp,
            maxAllowedPriceDifference
        });
    }
    
    public fun set_oracle_price(perp: ID, cap: &UpdateOraclePriceCapability, op: &mut OraclePrice, price: u128, sender: address){
        assert!(sender == cap.account, error::not_valid_price_oracle_operator());
        assert!(
            verify_oracle_price_update_diff(op.maxAllowedPriceDifference,price, op.price), 
            error::out_of_max_allowed_price_diff_bounds());

        op.price = price;
        emit(OraclePriceUpdated { 
            id: perp,
            price, 
            updatedAt: 0
        });
    }



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

    public fun price(op: OraclePrice): u128 {
        return op.price
    }

}