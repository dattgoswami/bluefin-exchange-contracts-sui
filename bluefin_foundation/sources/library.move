module bluefin_foundation::library {
    use std::vector;
    use sui::address;
    use std::hash;
    
    const BASE_UINT : u128 = 1000000000;
    const HALF_BASE_UINT : u128 = 500000000;

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
     * @dev given an amount in 6 decimal places, converts it to base(9) decimals 
     */
    public fun convert_usdc_to_base_decimals(amount: u128): u128 {
        return amount * 1000
    }

    public fun get_public_address(public_key: vector<u8>):address {
        let buff = vector::empty<u8>();

        vector::append(&mut buff, vector[1]); // signature scheme for secp256k1
        vector::append(&mut buff, public_key);

        let address_ex = hash::sha3_256(buff);
        let addr = vector::empty<u8>();
        let i = 0;
        while (i < 20) {
            let byte = vector::borrow(&address_ex, i);
            vector::push_back(&mut addr, *byte);
            i = i + 1;
        };

        return address::from_bytes(addr)
    }
}