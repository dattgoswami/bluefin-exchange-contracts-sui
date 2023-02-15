module bluefin_exchange::library {
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