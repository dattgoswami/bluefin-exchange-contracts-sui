

module firefly_exchange::foundation {

    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};
    use std::string::{Self, String};
    use sui::transfer;
    use sui::event;

    
    struct PerpetualCreationEvent has copy, drop {
        id: ID,
        name: String,
        minPrice: u64,
        maxPrice: u64,
        tickSize: u64,
        minQty: u64,
        maxQtyLimit: u64,
        maxQtyMarket: u64,
        stepSize: u64,
        mtbLong: u64,
        mtbShort: u64,
        initialMarginRequired: u64,
        maintenanceMarginRequired: u64,
        makerFee: u64,
        takerFee: u64,
    }

    struct AdminCap has key {
        id: UID,
    }

    struct Perpetual has key, store {
        id: UID,
        /// name of perpetual
        name: String,
        /// min price at which asset can be traded
        minPrice: u64,
        /// max price at which asset can be traded
        maxPrice: u64,
        /// the smallest decimal unit supported by asset for price
        tickSize: u64,
        /// minimum quantity of asset that can be traded
        minQty: u64,
        /// maximum quantity of asset that can be traded for limit order
        maxQtyLimit: u64,
        /// maximum quantity of asset that can be traded for market order
        maxQtyMarket: u64,
        /// the smallest decimal unit supported by asset for quantity
        stepSize: u64,
        ///  market take bound for long side ( 10% == 100000000000000000)
        mtbLong: u64,
        ///  market take bound for short side ( 10% == 100000000000000000)
        mtbShort: u64,
        /// imr: the initial margin collateralization percentage
        initialMarginRequired: u64,
        /// mmr: the minimum collateralization percentage
        maintenanceMarginRequired: u64,
        /// Default maker order fee for this Perpetual
        makerFee: u64,
        /// Default taker order fee for this Perpetual
        takerFee: u64,
    }


    //===========================================================//
    //                      INITIALIZATION
    //===========================================================//

    fun init(ctx: &mut TxContext) {        
        // giving deployer the admin cap
        let admin = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(admin, tx_context::sender(ctx));
    }

    


    //===========================================================//
    //                      ENTRY METHODS
    //===========================================================//


    /**
     * Creates a perpetual
     * Only Admin can create one
     * Transfers adminship of created perpetual to admin
     */
    public entry fun createPerpetual(
        _: &AdminCap, 
        name: vector<u8>, 
        minPrice: u64,
        maxPrice: u64,
        tickSize: u64,
        minQty: u64,
        maxQtyLimit: u64,
        maxQtyMarket: u64,
        stepSize: u64,
        mtbLong: u64,
        mtbShort: u64,
        initialMarginRequired: u64,
        maintenanceMarginRequired: u64,
        makerFee: u64,
        takerFee: u64,
        ctx: &mut TxContext
        ){
        
        let id = object::new(ctx);
        let perpID = object::uid_to_inner(&id);

        let perpetual = Perpetual {
            id: id,
            name: string::utf8(name),
            minPrice,
            maxPrice,
            tickSize,
            minQty,
            maxQtyLimit,
            maxQtyMarket,
            stepSize,
            mtbLong,
            mtbShort,
            initialMarginRequired,
            maintenanceMarginRequired,
            makerFee,
            takerFee,
        };

        event::emit(PerpetualCreationEvent {
            id: perpID,
            name: perpetual.name,
            minPrice,
            maxPrice,
            tickSize,
            minQty,
            maxQtyLimit,
            maxQtyMarket,
            stepSize,
            mtbLong,
            mtbShort,
            initialMarginRequired,
            maintenanceMarginRequired,
            makerFee,
            takerFee    
        });

        transfer::share_object(perpetual);

    }

    public entry fun setMinPrice( _: &AdminCap, perpetual: &mut Perpetual, minPrice: u64){
        assert!(minPrice > 0, 1);
        assert!(minPrice < perpetual.maxPrice, 2);        
        perpetual.minPrice = minPrice;
        // todo emit event
    }



    //===========================================================//
    //                      HELPER METHODS
    //===========================================================//

}