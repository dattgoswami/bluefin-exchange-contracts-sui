
module bluefin_foundation::test {

    use std::hash;
    use std::type_name::{TypeName};
    use std::ascii::String;

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

    struct CoinValue has copy,drop{
        value: u64,
        type_name: TypeName,
        name: String,
        addr: String
    }


    public entry fun verify_signature(signature: vector<u8>, public_key: vector<u8>, raw_msg: vector<u8>) {
        let result = library::verify_signature(signature, public_key, raw_msg);
        event::emit(SignatureVerifiedEvent {is_verified:library::get_result_status(result)});

    }


    public entry fun get_public_address(public_key: vector<u8>){
        let public_address = library::get_public_address(public_key);
        event::emit(PublicAddressGeneratedEvent {
            addr:to_bytes(public_address)});
    }

    public entry fun hash(maker:address, market:address){
        // let value = @0x7586a1eba8b4986abeafc704193428141445e5e3;
        // let bytes = bcs::to_bytes(&value);
        // let addr:address =  object::address_from_bytes(bytes);
        let order = order::pack_order(
            market, 
            24,
            1000000000000000000,
            1000000000000000000,
            1000000000000000000,
            maker,
            1747984534000,
            1668690862116
            );
        
        let serialized_order = order::get_serialized_order(order);

        event::emit(OrderSerializedEvent {serialized_order});
        event::emit(HashGeneratedEvent {hash:hash::sha2_256(serialized_order)});
    }
    
    public entry fun get_public_address_from_signed_order(
        market:address,
        maker: address,
        flags:u8,
        price: u128,
        quantity: u128,
        leverage: u128,
        expiration: u64,
        salt: u128,
        signature:vector<u8>,
        public_key: vector<u8>
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

        let result = library::verify_signature(signature, public_key, encoded_order);
        assert!(library::get_result_status(result), 1000);

        let address = library::get_public_address(library::get_result_public_key(result));
        event::emit(PublicAddressGeneratedEvent {addr:to_bytes(address)});

    }

}