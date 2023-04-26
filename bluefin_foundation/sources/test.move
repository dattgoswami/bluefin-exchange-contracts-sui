
module bluefin_foundation::test {

    use std::vector;
    use std::hash;
    use sui::ecdsa_k1;
    use sui::event;
    use sui::bcs;

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

    // public native fun ed25519_verify(signature: &vector<u8>, public_key: &vector<u8>, msg: &vector<u8>): bool;

    public entry fun verify_signature(signature: vector<u8>, public_key: vector<u8>, hashed_msg: vector<u8>) {
        let is_verified;
        let length = vector::length(&signature);
        if(length == 64){ // ed25519 has signature length 654
            is_verified = false;
            // ed25519_verify(&signature, &public_key, &hashed_msg);
        } else { // secp256k1 has signature length 65
            is_verified = ecdsa_k1::secp256k1_verify_recoverable(&signature, &public_key, &hashed_msg);
        };

        event::emit(SignatureVerifiedEvent {is_verified:is_verified});
    }

    struct Order has drop {
        market:address,
        maker: address,
        isBuy: bool,
        reduceOnly: bool,
        postOnly: bool,
        price: u128,
        quantity: u128,
        leverage: u128,
        expiration: u128,
        salt: u128,
    }

    public entry fun hash(maker:address, market:address){
        // let value = @0x7586a1eba8b4986abeafc704193428141445e5e3;
        // let bytes = bcs::to_bytes(&value);
        // let addr:address =  object::address_from_bytes(bytes);
        let order = Order {
            market: market,
            price: 1000000000,
            quantity:1000000000,
            leverage: 1000000000,
            isBuy: true,
            reduceOnly: false,
            postOnly: false,
            expiration: 3655643731,
            salt: 1668690862116,
            maker: maker
        };
        
        /*
        serializedOrder
         [0,15]     => price            (128 bits = 16 bytes)
         [16,31]    => quantity         (128 bits = 16 bytes)
         [32,47]    => leverage         (128 bits = 16 bytes)
         [48,63]    => expiration       (128 bits = 16 bytes)
         [64,79]    => salt             (128 bits = 16 bytes)
         [80,99]   => maker     (160 bits = 20 bytes)
         [100,119]   => market     (160 bits = 20 bytes)
         [120,120]  => reduceOnly       (1 byte)
         [121,121]  => isBuy            (1 byte)
         [122,122]  => postOnly            (1 byte)
        */
    
        let serialized_order = vector::empty<u8>();
        let price_b = bcs::to_bytes(&order.price);
        let quantity_b = bcs::to_bytes(&order.quantity);
        let leverage_b = bcs::to_bytes(&order.leverage);
        let maker_address_b = bcs::to_bytes(&order.maker); // doesn't need reverse
        let market_address_b = bcs::to_bytes(&order.market); // doesn't need reverse
        let expiration_b = bcs::to_bytes(&order.expiration);
        let salt_b = bcs::to_bytes(&order.salt);
        let reduce_only_b = bcs::to_bytes(&order.reduceOnly);
        let is_buy_b = bcs::to_bytes(&order.isBuy);
        let post_only_b = bcs::to_bytes(&order.postOnly);

        vector::reverse(&mut price_b);
        vector::reverse(&mut quantity_b);
        vector::reverse(&mut leverage_b);
        vector::reverse(&mut expiration_b);
        vector::reverse(&mut salt_b);

        vector::append(&mut serialized_order, price_b);
        vector::append(&mut serialized_order, quantity_b);
        vector::append(&mut serialized_order, leverage_b);
        vector::append(&mut serialized_order, expiration_b);
        vector::append(&mut serialized_order, salt_b);
        vector::append(&mut serialized_order, maker_address_b);
        vector::append(&mut serialized_order, market_address_b);
        vector::append(&mut serialized_order, reduce_only_b);
        vector::append(&mut serialized_order, is_buy_b);
        vector::append(&mut serialized_order, post_only_b);

        event::emit(OrderSerializedEvent {serialized_order});
        event::emit(HashGeneratedEvent {hash:hash::sha2_256(serialized_order)});
    }

    public entry fun get_public_address(public_key: vector<u8>){
        let buff = vector::empty<u8>();

        vector::append(&mut buff, vector[1]); // signature scheme for secp256k1
        vector::append(&mut buff, public_key);

        let address_ex = hash::sha3_256(buff);
        let address = vector::empty<u8>();
        let i = 0;
        while (i < 20) {
            let byte = vector::borrow(&address_ex, i);
            vector::push_back(&mut address, *byte);
            i = i + 1;
        };
        event::emit(PublicAddressGeneratedEvent {address:address});
    }
    
    public entry fun get_public_key(signature: vector<u8>, hash: vector<u8>){
        // Normalize the last byte of the signature to be 0 or 1.
        let v = vector::borrow_mut(&mut signature, 64);
        if (*v == 27) {
            *v = 0;
        } else if (*v == 28) {
            *v = 1;
        } else if (*v > 35) {
            *v = (*v - 1) % 2;
        };

        let pubkey = ecdsa_k1::ecrecover(&signature, &hash);
        event::emit(PublicKeyRecoveredEvent {public_key:pubkey});
    }
}
