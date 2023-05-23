
module bluefin_foundation::test {

    use std::hash;
    use sui::ecdsa_k1;
    use sui::event;
    use sui::hex;
    use sui::address::{to_bytes};
    use bluefin_foundation::order::{Self};
    use bluefin_foundation::library::{Self};

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
        addr: vector<u8>,
    }

    struct EncodedOrder has copy, drop {
        order: vector<u8>,
    }

    public entry fun verify_signature(signature: vector<u8>, public_key: vector<u8>, raw_msg: vector<u8>) {
        let is_verified = ecdsa_k1::secp256k1_verify(&signature, &public_key, &raw_msg, 1);       
        event::emit(SignatureVerifiedEvent {is_verified:is_verified});
    }

    public entry fun hash(maker:address, market:address){
        // let value = @0x7586a1eba8b4986abeafc704193428141445e5e3;
        // let bytes = bcs::to_bytes(&value);
        // let addr:address =  object::address_from_bytes(bytes);
        let order = order::pack_order(
            market, 
            24,
            1000000000,
            1000000000,
            1000000000,
            maker,
            1747984534000,
            1668690862116
            );
        
        let serialized_order = order::get_serialized_order(order);

        event::emit(OrderSerializedEvent {serialized_order});
        event::emit(HashGeneratedEvent {hash:hash::sha2_256(serialized_order)});
    }

    public entry fun get_public_address(public_key: vector<u8>){
        let public_address = library::get_public_address(public_key);
        event::emit(PublicAddressGeneratedEvent {
            addr:to_bytes(public_address)});
    }
    
    public entry fun get_public_key(signature: vector<u8>, msg: vector<u8>){        
        let pubkey = library::recover_public_key_from_signature(msg, signature);
        event::emit(PublicKeyRecoveredEvent {public_key:pubkey});
    }


    public entry fun hash_recover_pub_key(signature: vector<u8>, maker:address, market:address){
        // let value = @0x7586a1eba8b4986abeafc704193428141445e5e3;
        // let bytes = bcs::to_bytes(&value);
        // let addr:address =  object::address_from_bytes(bytes);
        let order = order::pack_order(
            market, 
            24,
            1000000000,
            1000000000,
            1000000000,
            maker,
            1747984534000,
            1668690862116
            );
               
        let serialized_order = order::get_serialized_order(order);
        
        event::emit(OrderSerializedEvent {serialized_order});
        event::emit(HashGeneratedEvent {hash:hash::sha2_256(serialized_order)});

        let encoded_order = hex::encode(serialized_order);
        
        let pubkey = library::recover_public_key_from_signature(encoded_order, signature);
        event::emit(PublicKeyRecoveredEvent {public_key:pubkey});
    }

    public entry fun get_public_key_from_signed_order(
        market:address,
        maker: address,
        flags:u8,
        price: u128,
        quantity: u128,
        leverage: u128,
        expiration: u64,
        salt: u128,
        signature:vector<u8>
    ) {

        let order = order::pack_order(
            market, 
            flags,
            price,
            quantity,
            leverage,
            maker,
            expiration,
            salt
            );

        let serialized_order = order::get_serialized_order(order);
        
        event::emit(OrderSerializedEvent {serialized_order});
        event::emit(HashGeneratedEvent {hash:hash::sha2_256(serialized_order)});

        let encoded_order = hex::encode(serialized_order);
        
        event::emit(EncodedOrder {order: encoded_order});

        let pubkey = library::recover_public_key_from_signature(encoded_order, signature);
        event::emit(PublicKeyRecoveredEvent {public_key:pubkey});
    }
}