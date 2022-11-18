module firefly_exchange::library {

    const BASE_UINT : u64 = 1000000000;

    public fun base_uint() : u64
    {
        return BASE_UINT
    }

}