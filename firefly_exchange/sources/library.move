module firefly_exchange::library {

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

}