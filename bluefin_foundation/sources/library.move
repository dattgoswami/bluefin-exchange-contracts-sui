module bluefin_foundation::library {
    use std::vector;
    use sui::address;
    use sui::hash;
    use sui::ecdsa_k1;
    use sui::ed25519;
    use sui::bcs;
    use std::hash as std_hash;
    use sui::math::pow;

    const BASE_UINT : u128 = 1000000000;
    const HALF_BASE_UINT : u128 = 500000000;

   const SIGNED_USING_SECP_KEYPAIR : u8 = 0;
   const SIGNED_USING_ED_KEYPAIR : u8 = 1;
   const SIGNED_USING_ED_UI_WALLET : u8 = 1;

    use Pyth::price_info::{PriceInfoObject};
    use Pyth::price::{Price};
    use Pyth::i64::{I64};

    
    struct VerificationResult has copy,drop {
        is_verified: bool,
        public_key: vector<u8>
    }


    /**
     * @dev Getter for constants as reading directly from modules isn't allowed
     */
    public fun base_uint() : u128 {
        return BASE_UINT
    }

     /**
     * @dev Getter for constants as reading directly from modules isn't allowed
     */
    public fun half_base_uint() : u128 {
        return HALF_BASE_UINT
    }


    /**
     * @dev Multiplication by a base value with the result rounded down
     */
    public fun base_mul(value : u128, baseValue: u128) : u128 {
        return (value * baseValue) / BASE_UINT
    }

     /**
     * @dev Division by a base value with the result rounded down
     */
    public fun base_div(value : u128, baseValue: u128): u128 {
        return (value * BASE_UINT) / baseValue 
    }

    /**
     * @dev Returns ceil(a,m)
     */
    public fun ceil(a : u128, m : u128) :u128 {
        return ((a + m - 1) / m) * m
    }
    
    /**
     * @dev Returns Min(a,b)
     */
    public fun min(a : u128, b : u128) :u128 {
        return if ( a < b ) {a} else {b}
    }

    /**
     * @dev Returns a - b if possible else 0
     */
    public fun sub(a : u128, b : u128) :u128 {
        return if (a > b) { a - b } else {0}
    }

    public fun round_down(num:u128): u128 {
        return (num / base_uint()) * base_uint()
    }


    /**
     * @dev rounds price to conform to tick size
     * if number is 12.56 and decimals is 0.1, will round up the number to 12.6
     * if number is 12.53 and decimals is 0.1, will round down the number to 12.5
     */
    public fun round(num: u128, decimals: u128): u128 {
        num = num + (decimals * 5) / 10;
        return num - (num % decimals)
    }

    /**
     * computes mro from leverage. mro = 1/leverage
     */
    public fun compute_mro(leverage:u128): u128 {
        return base_div(base_uint(), leverage)
    }

    /**
     * @dev given an amount in 6 decimal places, converts it to base(9) decimals 
     */
    public fun convert_usdc_to_base_decimals(amount: u128): u128 {
        return amount * 1000
    }

    /**
     * @dev returns sha256 hash of the msg
     */
    public fun get_hash(msg: vector<u8>): vector<u8>{
            return std_hash::sha2_256(msg)        
    }

    /**
     * Returns true if the provided signature is verified
     */
    public fun verify_signature(signature: vector<u8>, public_key: vector<u8>, raw_msg: vector<u8>): VerificationResult {

        let element = vector::pop_back(&mut signature);
        let result = VerificationResult{is_verified: false, public_key: public_key};

        // signature is generated using secp256k1
        if(element == SIGNED_USING_SECP_KEYPAIR) {
            // the 1 passed to secp256k1_verify assumes the msg was hashed using sha256
            // the msg being passed is not hashed
            result.is_verified = ecdsa_k1::secp256k1_verify(&signature, &public_key, &raw_msg, 1);       
            vector::insert(&mut result.public_key, 1, 0);

        } 
        // signature is generated using ed2559
        else if(element == SIGNED_USING_ED_KEYPAIR) {
            // take hash of the msh
            let msg = get_hash(raw_msg);
            // the msg expected to be hashed
            result.is_verified = ed25519::ed25519_verify(&signature, &public_key, &msg);       
            vector::insert(&mut result.public_key, 0, 0);

        }
         // signature is generated using ed2559 ui wallet (signMessage)
        else if(element == SIGNED_USING_ED_UI_WALLET) {
        
            let sha256_msg = get_hash(raw_msg);
    
            // serialize the hash    
            let serialize = bcs::to_bytes(&sha256_msg);
    
            // append [3,0,0] intent bytes to msg
            let intent_bytes = vector::empty<u8>();
            vector::push_back(&mut intent_bytes, 3);
            vector::push_back(&mut intent_bytes, 0);
            vector::push_back(&mut intent_bytes, 0);
            vector::append(&mut intent_bytes, serialize);
        
            let blake_encoded = hash::blake2b256(&intent_bytes);
    
            result.is_verified = ed25519::ed25519_verify(&signature, &public_key, &blake_encoded);       
            vector::insert(&mut result.public_key, 0, 0);

        };

        return result
    }

    /**
     * Returns public address from the public key
     */
    public fun get_public_address(public_key: vector<u8>): address{

        let address_ex = hash::blake2b256(&public_key);
        let address = vector::empty<u8>();
        let i = 0;
        while (i < 32) {
            let byte = vector::borrow(&address_ex, i);
            vector::push_back(&mut address, *byte);
            i = i + 1;
        };

        return address::from_bytes(address)
    }

    public fun get_result_status(result:VerificationResult): bool{
        result.is_verified
    }

    public fun get_result_public_key(result:VerificationResult): vector<u8>{
        result.public_key
    }

    /*
    Gets the Oracle Price from Pyth Network.
    Input is PriceInfoObject id for the relevant symbol example "ETH-PERP"
    It returns the price in u128 format
    */
    public entry fun get_oracle_price(price_info_obj: &PriceInfoObject
    ): u128{
        let price: Price = Pyth::pyth::get_price_unsafe(price_info_obj);   
        let price_i64: I64 = Pyth::price::get_price(&price);
        let price_u64: u64 = Pyth::i64::get_magnitude_if_positive(&price_i64);
        return (price_u64 as u128)
    }

    public entry fun get_oracle_base(price_info_obj: &PriceInfoObject
    ): u128{
        let price: Price = Pyth::pyth::get_price_unsafe(price_info_obj);   
        let expo_i64: I64 = Pyth::price::get_expo(&price);
        let expo_u64: u64 = Pyth::i64::get_magnitude_if_negative(&expo_i64);
        return (expo_u64 as u128)
    }

    public entry fun get_price_identifier(price_info_obj: &PriceInfoObject): vector<u8>{
        let priceInfo=Pyth::price_info::get_price_info_from_price_info_object(price_info_obj);
        let priceIdentifier= Pyth::price_info::get_price_identifier(&priceInfo);
        let priceIdentifierBytes = Pyth::price_identifier::get_bytes(&priceIdentifier);
        return priceIdentifierBytes
    }
    
    

}