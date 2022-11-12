
module firefly_exchange::perpetual {

    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};
    use std::string::{Self, String};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table, add, contains, borrow_mut};

    // custom modules
    use firefly_exchange::position::{Self, UserPosition};
    // use firefly_exchange::evaluator::{Self};

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

    struct MinOrderPriceUpdateEvent has copy, drop {
        id: ID,
        price: u64
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
        /// table containing user positions for this market/perpetual
        positions: Table<address,UserPosition>,
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
        

        // TODO perform assertions on remaining variables
        assert!(minPrice > 0, 1);
        assert!(minPrice < maxPrice, 2);        


        let id = object::new(ctx);
        let perpID = object::uid_to_inner(&id);

        let positions = table::new<address, UserPosition>(ctx);

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
            positions,
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

    /**
     * Updates minimum price of the perpetual 
     * Only Admin can update price
     */
    public entry fun setMinPrice( _: &AdminCap, perpetual: &mut Perpetual, minPrice: u64){
        // TODO find a way to move setMinPrice and other setter methods to evaluator module
        // getting error that perpetual.fieldName can only be acccessed with in the module 
        // that created the perpetual object
        
        assert!(minPrice > 0, 1);
        assert!(minPrice < perpetual.maxPrice, 2);        
        perpetual.minPrice = minPrice;

        event::emit(MinOrderPriceUpdateEvent{
            id: object::uid_to_inner(&perpetual.id),
            price: minPrice
        })
    }   

    /**
     * Creates a new position and adds to perpetual
     *
     */
    public entry fun createPosition(perp: &mut Perpetual,  ctx: &mut TxContext){
            let account = tx_context::sender(ctx);
            let perpID = object::uid_to_inner(&perp.id);

            // position for the account should not exist in table
            assert!(contains(&mut perp.positions, account) == false, 6);


            let userPosition = position::initPosition(perpID, account);            
            add(&mut perp.positions, account, userPosition);
    }   

    // for testing purpose only, will be removed
    public entry fun mutatePosition(perp: &mut Perpetual, user:address, isPosPositive: bool, qPos: u128, margin: u128, oiOpen: u128, mro: u128){       

        assert!(contains(&mut perp.positions, user) == true, 6);

        let perpID = object::uid_to_inner(&perp.id);

        let position = borrow_mut(&mut perp.positions, user);
        position::updatePosition(perpID, position, user, isPosPositive, qPos, margin, oiOpen, mro);
        
    }


    //===========================================================//
    //                      HELPER METHODS
    //===========================================================//

}


