module bluefin_foundation::library {
    use std::vector;
    use sui::address;
    use sui::hash;
    use sui::ecdsa_k1;
    use std::hash as std_hash;

    const BASE_UINT : u128 = 1000000000;
    const HALF_BASE_UINT : u128 = 500000000;

    use Pyth::price_info::{PriceInfoObject};
    use Pyth::price::{Price};
    use Pyth::i64::{I64};

    

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
     * @dev given a raw message and its signature, returns the public key of signer
     * assumes the hashing method used is sha256
     */
    public fun recover_public_key_from_signature(rawMsg: vector<u8>, signature: vector<u8>):vector<u8>{

        let v = vector::borrow_mut(&mut signature, 64);
        
        if (*v == 27) {
            *v = 0;
        } else if (*v == 28) {
            *v = 1;
        } else if (*v > 35) {
            *v = (*v - 1) % 2;
        };

        // @dev assumes msg was signed using sha256 hence the last param is 1
        let public_key = ecdsa_k1::secp256k1_ecrecover(&signature, &rawMsg, 1);

        return public_key

    }

    /**
     * Returns public address from the public key
     */
    public fun get_public_address(public_key: vector<u8>): address{
        let buff = vector::empty<u8>();

        vector::append(&mut buff, vector[1]); // signature scheme for secp256k1
        vector::append(&mut buff, public_key);

        let address_ex = hash::blake2b256(&buff);
        let address = vector::empty<u8>();
        let i = 0;
        while (i < 32) {
            let byte = vector::borrow(&address_ex, i);
            vector::push_back(&mut address, *byte);
            i = i + 1;
        };

        return address::from_bytes(address)
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

    public entry fun get_price_identifier(price_info_obj: &PriceInfoObject): vector<u8>{
        let priceInfo=Pyth::price_info::get_price_info_from_price_info_object(price_info_obj);
        let priceIdentifier= Pyth::price_info::get_price_identifier(&priceInfo);
        let priceIdentifierBytes = Pyth::price_identifier::get_bytes(&priceIdentifier);
        return priceIdentifierBytes
    }
    
}