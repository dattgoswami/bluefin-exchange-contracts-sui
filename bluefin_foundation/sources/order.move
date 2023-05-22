module bluefin_foundation::order {
    use sui::table::{Self, Table};
    // use sui::tx_context::{Self, TxContext};
    use sui::event::{emit};
    use std::vector;
    use sui::bcs;
    use std::hash;
    use sui::hex;

    // custom modules
    use bluefin_foundation::roles::{Self, SubAccounts};
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::library::{Self};

    // friend modules
    friend bluefin_foundation::isolated_trading;

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct OrderFill has copy, drop {
        orderHash:vector<u8>,
        order: Order,
        sigMaker: address,
        fillPrice: u128,
        fillQty: u128,
        newFilledQuantity: u128        
    }


    //===========================================================//
    //                           STORAGE                         //
    //===========================================================//

    struct OrderFlags has drop, copy {
            ioc: bool,
            postOnly: bool,
            reduceOnly: bool,
            isBuy: bool,
            orderbookOnly: bool,
        }

    struct Order has drop, copy {
        market:address,
        maker: address,
        isBuy: bool,
        reduceOnly: bool,
        postOnly: bool,
        orderbookOnly: bool,
        ioc: bool,
        flags: u8,
        price: u128,
        quantity: u128,
        leverage: u128,
        expiration: u128,
        salt: u128
    }

    struct OrderStatus has store {
        status: bool,
        filledQty: u128
    }
        
    //===========================================================//
    //                       ENTRY METHOD                        //
    //===========================================================//

    /**
     * Allows caller to cancel their order
     */
    // entry fun cancel_order(
    //     perp: &Perpetual,
    //     subAccounts: &SubAccounts,
    //     ordersTable: &mut Table<vector<u8>, OrderStatus>,
    //     orderFlags:u8,
    //     orderPrice: u128,
    //     orderQuantity: u128,
    //     orderLeverage: u128,
    //     orderExpiration: u128,
    //     orderSalt: u128,
    //     makerAddress: address,
    //     signature:vector<u8>,
    //     ctx: &mut TxContext
    //     ){

    //     let caller = tx_context::sender(ctx);    

    // }

    //===========================================================//
    //                          ACCESSORS                        //
    //===========================================================//

    public fun flag_orderbook_only(flags:u8): bool{
        return (flags & 16) > 0
    }

    public fun isBuy(order:Order): bool{
        return order.isBuy
    }

    public fun maker(order:Order): address{
        return order.maker
    }


    public fun market(order:Order): address{
        return order.market
    }


    public fun reduceOnly(order:Order): bool{
        return order.reduceOnly
    }


    public fun postOnly(order:Order): bool{
        return order.postOnly
    }


    public fun orderbookOnly(order:Order): bool{
        return order.orderbookOnly
    }

    public fun ioc(order:Order): bool{
        return order.ioc
    }

    public fun flags(order:Order): u8{
        return order.flags
    }

    public fun price(order:Order): u128{
        return order.price
    }

    public fun quantity(order:Order): u128{
        return order.quantity
    }

    public fun leverage(order:Order): u128{
        return order.leverage
    }

    public fun expiration(order:Order): u128{
        return order.expiration
    }

    public fun salt(order:Order): u128{
        return order.salt
    }

    //===========================================================//
    //                      PUBLIC METHODS                       //
    //===========================================================//

    public fun pack_order(
        market: address,
        flags:u8,
        price: u128,
        quantity: u128,
        leverage: u128,
        maker: address,
        expiration: u128,
        salt: u128,
    ): Order {

        let decoded_flags = decode_order_flags(flags);

        return Order {
                market,
                maker,
                isBuy: decoded_flags.isBuy,
                postOnly: decoded_flags.postOnly,
                orderbookOnly: decoded_flags.orderbookOnly,
                reduceOnly: decoded_flags.reduceOnly,
                ioc: decoded_flags.ioc,
                flags,
                price,
                quantity,
                leverage,
                expiration,
                salt
        }
    }

    public fun get_serialized_order(order:Order): vector<u8>{
        
        /*
        serializedOrder
         [0,15]     => price            (128 bits = 16 bytes)
         [16,31]    => quantity         (128 bits = 16 bytes)
         [32,47]    => leverage         (128 bits = 16 bytes)
         [48,63]    => expiration       (128 bits = 16 bytes)
         [64,79]    => salt             (128 bits = 16 bytes)
         [80,111]   => maker            (160 bits = 32 bytes)
         [112,143]   => market          (160 bits = 32 bytes)
         [144,144]  => flags       (1 byte)
         [145,151]  => domain (Bluefin) (7 bytes)
         */


        let serialized_order = vector::empty<u8>();
        let price_b = bcs::to_bytes(&order.price);
        let quantity_b = bcs::to_bytes(&order.quantity);
        let leverage_b = bcs::to_bytes(&order.leverage);
        let maker_address_b = bcs::to_bytes(&order.maker); // doesn't need reverse
        let market_address_b = bcs::to_bytes(&order.market); // doesn't need reverse
        let expiration_b = bcs::to_bytes(&order.expiration);
        let salt_b = bcs::to_bytes(&order.salt);
        let flags_b = bcs::to_bytes(&order.flags);

        vector::reverse(&mut price_b);
        vector::reverse(&mut quantity_b);
        vector::reverse(&mut leverage_b);
        vector::reverse(&mut expiration_b);
        vector::reverse(&mut salt_b);
        vector::reverse(&mut flags_b);

        vector::append(&mut serialized_order, price_b);
        vector::append(&mut serialized_order, quantity_b);
        vector::append(&mut serialized_order, leverage_b);
        vector::append(&mut serialized_order, expiration_b);
        vector::append(&mut serialized_order, salt_b);
        vector::append(&mut serialized_order, maker_address_b);
        vector::append(&mut serialized_order, market_address_b);
        vector::append(&mut serialized_order, flags_b);
        vector::append(&mut serialized_order, b"Bluefin");

        return serialized_order

    }

    //===========================================================//
    //                    PUBLIC FRIEND METHODS                  //
    //===========================================================//

    public (friend) fun set_price(order:&mut Order, price:u128) {
        order.price = price;
    }

    public (friend) fun set_leverage(order:&mut Order, leverage:u128) {
        order.leverage = leverage;
    }

    public (friend) fun create_order(ordersTable: &mut Table<vector<u8>, OrderStatus>, hash: vector<u8>){
        // if the order does not already exists on-chain
        if (!table::contains(ordersTable, hash)){
            table::add(ordersTable, hash, OrderStatus {status:true, filledQty: 0});
        };
    }

    public (friend) fun verify_order_state(ordersTable: &mut Table<vector<u8>, OrderStatus>, hash:vector<u8>, isTaker:u64){        
        let order = table::borrow(ordersTable, hash);
        assert!(order.status, error::order_is_canceled(isTaker));
    }

    public (friend) fun verify_and_fill_order_qty(
        ordersTable: &mut Table<vector<u8>, OrderStatus>, 
        order:Order, 
        orderHash:vector<u8>, 
        fillPrice:u128,
        fillQty:u128, 
        userPosPositive:bool,
        userQPos:u128,
        sigMaker:address, 
        isTaker:u64){
        
         // Ensure order is being filled at the specified or better price
        // For long/buy orders, the fill price must be equal or lower
        // For short/sell orders, the fill price must be equal or higher
        let validPrice = if (order.isBuy) { fillPrice <= order.price } else {fillPrice >= order.price};

        assert!(validPrice, error::fill_price_invalid(isTaker));

        // For reduce only orders, ensure that the order would result in an
        // open position's size to reduce (fill amount <= open position size)
        if(order.reduceOnly){

            // Reduce only order must be in the opposite direction as open position 
            // (a positive position size means open position is Buy)
            // Reduce only order size must be less than open position size.
            // Size sign is stored separately (sizeIsPositive) so this is an absolute value comparison
            // regardless of position direction (Buy or Sell)
            assert!(
                order.isBuy != userPosPositive && 
                fillQty <= userQPos, 
                error::fill_does_not_decrease_size(isTaker));        
        };


        let orderStatus = table::borrow_mut(ordersTable, orderHash);

        orderStatus.filledQty = orderStatus.filledQty + fillQty;

        assert!(orderStatus.filledQty  <=  order.quantity,  error::cannot_overfill_order(isTaker));

        emit(OrderFill{
                orderHash,
                order,
                sigMaker,
                fillPrice,
                fillQty,
                newFilledQuantity: orderStatus.filledQty
        });
    }

    public (friend) fun verify_order_signature(subAccounts: &SubAccounts, maker:address, orderSerialized: vector<u8>, signature: vector<u8>, isTaker:u64):address{

        let encodedOrder = hex::encode(orderSerialized);
        let publicKey = library::recover_public_key_from_signature(encodedOrder, signature);
        let publicAddress = library::get_public_address(publicKey);

        assert!(
            maker == publicAddress || 
            roles::is_sub_account(subAccounts, maker, publicAddress), 
            error::order_has_invalid_signature(isTaker));

        return publicAddress
    }

    public (friend) fun verify_order_expiry(expiry:u128, isTaker:u64){
        // TODO compare with chain time
        assert!(expiry == 0 || expiry > 1, error::order_expired(isTaker));
    }

    public (friend) fun verify_order_leverage(mro: u128, leverage:u128, isTaker:u64){
        assert!(leverage > 0, error::leverage_must_be_greater_than_zero(isTaker));        
        assert!(
            mro == 0 || library::compute_mro(leverage) == mro, 
            error::invalid_leverage(isTaker));

    }

    //===========================================================//
    //                         HELPERS                           //
    //===========================================================//

    fun decode_order_flags(flags:u8): OrderFlags{
        return OrderFlags{
            ioc: (flags & 1) > 0,
            postOnly: (flags & 2) > 0,
            reduceOnly: (flags & 4) > 0,
            isBuy: (flags & 8) > 0,
            orderbookOnly: (flags & 16) > 0
        }
    }


}