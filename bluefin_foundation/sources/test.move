
module bluefin_foundation::test {

    use std::vector;
    use std::hash;
    use sui::ecdsa_k1;
    use sui::event;
    use sui::bcs;
    use bluefin_foundation::evaluator::{initialize,verify_qty_checks,verify_price_checks,verify_market_take_bound_checks,verify_oi_open_for_account};

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

    public entry fun hash(addr:address){
        // let value = @0x9e61bd8cac66d89b78ebd145d6bbfbdd6ff550cf;
        // let bytes = bcs::to_bytes(&value);
        // let addr:address =  object::address_from_bytes(bytes);
        let order = Order { 
            price: 1000000000,
            quantity:1000000000,
            leverage: 1000000000,
            isBuy: true,
            reduceOnly: false,
            triggerPrice: 0,
            expiration: 3655643731,
            salt: 1668690862116,
            makerAddress: addr
        };
        
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

    public entry fun testTradeVerificationFunctions(
        minPrice: u128,
        maxPrice: u128,
        tickSize: u128,
        minQty: u128,
        maxQtyLimit: u128,
        maxQtyMarket: u128,
        stepSize: u128,
        mtbLong: u128,
        mtbShort: u128,
        maxOILimit: vector<u128>,
        tradeQty: u128,
        tradePrice: u128,
        oraclePrice: u128,
        isBuy: bool,
        mro: u128,
        oiOpen: u128
        ) {
            
            let maxAllowedOIOpen : vector<u128> = vector::empty();
            // Push dummy value at index 0 because leverage starts at 1
            vector::push_back(&mut maxAllowedOIOpen, 0);
            vector::append(&mut maxAllowedOIOpen, maxOILimit);
        
            let checks = initialize(
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
            );

            let isTaker : u64 = 0;

            verify_qty_checks(checks,tradeQty);
            verify_price_checks(checks, tradePrice);
            verify_market_take_bound_checks(checks,tradePrice,oraclePrice,isBuy);
            verify_oi_open_for_account(checks, mro, oiOpen,isTaker);
        }
}
