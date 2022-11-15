
module firefly_exchange::test {

    use std::vector;
    use sui::ecdsa;
    use sui::event;

    struct SignatureVerifiedEvent has copy, drop {
        is_verified: bool,
    }

    // public native fun ed25519_verify(signature: &vector<u8>, public_key: &vector<u8>, msg: &vector<u8>): bool;

    public entry fun verifySignature(signature: vector<u8>, public_key: vector<u8>, hashed_msg: vector<u8>) {
        let is_verified;
        let length = vector::length(&signature);
        if(length == 64){ // ed25519 has signature length 654
            is_verified = false;
            // ed25519_verify(&signature, &public_key, &hashed_msg);
        }else { // secp256k1 has signature length 65
            is_verified = ecdsa::secp256k1_verify(&signature, &public_key, &hashed_msg);
        };

        event::emit(SignatureVerifiedEvent {is_verified:is_verified});
    }
}
