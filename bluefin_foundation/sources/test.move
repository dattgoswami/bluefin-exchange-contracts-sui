
module bluefin_foundation::test {

    use std::vector;
    use std::hash;
    use sui::ecdsa_k1;
    use sui::event;
    use sui::bcs;
    use sui::hex;
    use sui::hash as suihash;

    struct SignatureVerifiedEvent has copy, drop {
        is_verified: bool,
    }

    struct PublicKeyRecoveredEvent has copy, drop {
        public_key: vector<u8>,
    }

    struct HashGeneratedEvent has copy, drop {
        hash: vector<u8>,
    }

    struct OrderSerializedEvent has copy, drop {
        serialized_order: vector<u8>,
    }

    struct PublicAddressGeneratedEvent has copy, drop {
        address: vector<u8>,
    }

    struct EncodedOrder has copy, drop {
        order: vector<u8>,
    }

    public entry fun verify_signature(signature: vector<u8>, public_key: vector<u8>, raw_msg: vector<u8>) {
        let is_verified = ecdsa_k1::secp256k1_verify(&signature, &public_key, &raw_msg, 1);       
        event::emit(SignatureVerifiedEvent {is_verified:is_verified});
    }

    struct Order has drop {
        market:address,
        maker: address,
        isBuy: bool,
        reduceOnly: bool,
        postOnly: bool,
        orderbookOnly: bool,
        flags:u8,
        price: u128,
        quantity: u128,
        leverage: u128,
        expiration: u128,
        salt: u128,
    }

    fun get_serialized_order(order: Order):vector<u8>{
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

    fun recover_public_key_from_signature(signature: vector<u8>, msg: vector<u8>):vector<u8>{

        // Normalize the last byte of the signature to be 0 or 1.
        let v = vector::borrow_mut(&mut signature, 64);
        if (*v == 27) {
            *v = 0;
        } else if (*v == 28) {
            *v = 1;
        } else if (*v > 35) {
            *v = (*v - 1) % 2;
        };
        
        let pubkey = ecdsa_k1::secp256k1_ecrecover(&signature, &msg, 1);

        return pubkey

    }

    public entry fun hash(maker:address, market:address){
        // let value = @0x7586a1eba8b4986abeafc704193428141445e5e3;
        // let bytes = bcs::to_bytes(&value);
        // let addr:address =  object::address_from_bytes(bytes);
        let order = Order {
            market: market,
            price: 1000000000,
            quantity: 1000000000,
            leverage: 1000000000,
            isBuy: true,
            reduceOnly: false,
            postOnly: false,
            orderbookOnly: true,
            flags:24,
            expiration: 3655643731,
            salt: 1668690862116,
            maker: maker
        };
        
        let serialized_order = get_serialized_order(order);

        event::emit(OrderSerializedEvent {serialized_order});
        event::emit(HashGeneratedEvent {hash:hash::sha2_256(serialized_order)});
    }

    public entry fun get_public_address(public_key: vector<u8>){
        let buff = vector::empty<u8>();

        vector::append(&mut buff, vector[1]); // signature scheme for secp256k1
        vector::append(&mut buff, public_key);

        let address_ex = suihash::blake2b256(&buff);
        let address = vector::empty<u8>();
        let i = 0;
        while (i < 32) {
            let byte = vector::borrow(&address_ex, i);
            vector::push_back(&mut address, *byte);
            i = i + 1;
        };
        event::emit(PublicAddressGeneratedEvent {address:address});
    }
    
    public entry fun get_public_key(signature: vector<u8>, msg: vector<u8>){        
        let pubkey = recover_public_key_from_signature(signature, msg);
        event::emit(PublicKeyRecoveredEvent {public_key:pubkey});
    }


    public entry fun hash_recover_pub_key(signature: vector<u8>, maker:address, market:address){
        // let value = @0x7586a1eba8b4986abeafc704193428141445e5e3;
        // let bytes = bcs::to_bytes(&value);
        // let addr:address =  object::address_from_bytes(bytes);
        let order = Order {
            market: market,
            price: 1000000000,
            quantity: 1000000000,
            leverage: 1000000000,
            isBuy: true,
            reduceOnly: false,
            postOnly: false,
            orderbookOnly: true,
            flags:24,
            expiration: 3655643731,
            salt: 1668690862116,
            maker: maker
        };
               
        let serialized_order = get_serialized_order(order);
        
        event::emit(OrderSerializedEvent {serialized_order});
        event::emit(HashGeneratedEvent {hash:hash::sha2_256(serialized_order)});

        let encoded_order = hex::encode(serialized_order);
        
        let pubkey = recover_public_key_from_signature(signature, encoded_order);
        event::emit(PublicKeyRecoveredEvent {public_key:pubkey});
    }

    public entry fun get_public_key_from_signed_order(
        market:address,
        maker: address,
        isBuy: bool,
        reduceOnly: bool,
        postOnly: bool,
        orderbookOnly: bool,
        flags:u8,
        price: u128,
        quantity: u128,
        leverage: u128,
        expiration: u128,
        salt: u128,
        signature:vector<u8>
    ) {

        let order = Order {
            market,
            price,
            quantity,
            leverage,
            isBuy,
            reduceOnly,
            postOnly,
            orderbookOnly,
            expiration,
            salt,
            maker,
            flags
        };


        let serialized_order = get_serialized_order(order);
        
        event::emit(OrderSerializedEvent {serialized_order});
        event::emit(HashGeneratedEvent {hash:hash::sha2_256(serialized_order)});

        let encoded_order = hex::encode(serialized_order);
        
        event::emit(EncodedOrder {order: encoded_order});

        let pubkey = recover_public_key_from_signature(signature, encoded_order);
        event::emit(PublicKeyRecoveredEvent {public_key:pubkey});
    }
}