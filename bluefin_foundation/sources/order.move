module bluefin_foundation::order {
    use std::vector;
    use std::hash;
    use sui::bcs;
    use sui::object::{ID};

    struct Order has drop, copy {
        isBuy: bool,
        price: u128,
        quantity: u128,
        leverage: u128,
        reduceOnly: bool,
        makerAddress: address,
        expiration: u128,
        salt: u128,
        triggerPrice: u128,
    }

    public fun pack_object(
        triggerPrice: u128,
        isBuy: bool,
        price: u128,
        quantity: u128,
        leverage: u128,
        reduceOnly: bool,
        makerAddress: address,
        expiration: u128,
        salt: u128,
    ): Order {
        return Order {
                triggerPrice,
                isBuy,
                price,
                quantity,
                leverage,
                reduceOnly,
                makerAddress,
                expiration,
                salt,
        }
    }

    public fun maker(order:Order):address{
        return order.makerAddress
    }

    public fun isBuy(order:Order):bool{
        return order.isBuy
    }

    public fun quantity(order:Order):u128{
        return order.quantity
    }

    public fun price(order:Order):u128{
        return order.price
    }

    public fun leverage(order:Order):u128{
        return order.leverage
    }

    public fun reduceOnly(order:Order):bool{
        return order.reduceOnly
    }

    public fun expiration(order:Order):u128{
        return order.expiration
    }

    public fun salt(order:Order):u128{
        return order.salt
    }

    public fun triggerPrice(order:Order):u128{
        return order.triggerPrice
    }

    public fun set_price(order: &mut Order, price:u128){
        order.price = price;
    }

    public fun set_leverage(order: &mut Order, leverage:u128){
        order.leverage = leverage;
    }

    public fun get_hash(order:Order, _perpID: ID): vector<u8>{
        /*
        serializedOrder
         [0,15]     => price            (128 bits = 16 bytes)
         [16,31]    => quantity         (128 bits = 16 bytes)
         [32,47]    => leverage         (128 bits = 16 bytes)
         [48,63]    => expiration       (128 bits = 16 bytes)
         [64,79]    => salt             (128 bits = 16 bytes)
         [80,95]    => triggerPrice     (128 bits = 16 bytes)
         [96,115]   => makerAddress     (160 bits = 20 bytes)
         [116,116]  => reduceOnly       (1 byte)
         [117,117]  => isBuy            (1 byte)
        */

        let serialized_order = vector::empty<u8>();
        let price_b = bcs::to_bytes(&order.price);
        let quantity_b = bcs::to_bytes(&order.quantity);
        let leverage_b = bcs::to_bytes(&order.leverage);
        let maker_address_b = bcs::to_bytes(&order.makerAddress); // doesn't need reverse
        let expiration_b = bcs::to_bytes(&order.expiration);
        let salt_b = bcs::to_bytes(&order.salt);
        let trigger_price_b = bcs::to_bytes(&order.triggerPrice);
        let reduce_only_b = bcs::to_bytes(&order.reduceOnly);
        let is_buy_b = bcs::to_bytes(&order.isBuy);


        vector::reverse(&mut price_b);
        vector::reverse(&mut quantity_b);
        vector::reverse(&mut leverage_b);
        vector::reverse(&mut expiration_b);
        vector::reverse(&mut salt_b);
        vector::reverse(&mut trigger_price_b);

        vector::append(&mut serialized_order, price_b);
        vector::append(&mut serialized_order, quantity_b);
        vector::append(&mut serialized_order, leverage_b);
        vector::append(&mut serialized_order, expiration_b);
        vector::append(&mut serialized_order, salt_b);
        vector::append(&mut serialized_order, trigger_price_b);
        vector::append(&mut serialized_order, maker_address_b);
        vector::append(&mut serialized_order, reduce_only_b);
        vector::append(&mut serialized_order, is_buy_b);

        return hash::sha2_256(serialized_order)

    }




}