
module firefly_exchange::perpetual {

    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};
    use std::string::{Self, String};
    use sui::transfer;
    use sui::event::{emit};
    use sui::table::{Self, Table, add, contains, remove, borrow_mut};

    // custom modules
    use firefly_exchange::position::{Self, UserPosition};
    use firefly_exchange::evaluator::{Self, TradeChecks};


    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//
    struct PerpetualCreationEvent has copy, drop {
        id: ID,
        name: String,
        checks:TradeChecks,
        initialMarginRequired: u64,
        maintenanceMarginRequired: u64,
        makerFee: u64,
        takerFee: u64,
    }

    struct OperatorUpdateEvent has copy, drop {
        account:address,
        status: bool
    }

    struct AdminCap has key {
        id: UID,
    }

    struct Perpetual has key, store {
        id: UID,
        /// name of perpetual
        name: String,
        /// Trade Checks
        checks: TradeChecks,
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

        // create settlement operators table
        let settlementOperators = table::new<address, bool>(ctx);
        transfer::share_object(settlementOperators);   

    }

    
    //===========================================================//
    //                      ENTRY METHODS
    //===========================================================//


    /**
     * Updates status(active/inactive) of settlement operator
     * Only Admin can invoke this method
     */
    public entry fun updateOperator(_:&AdminCap, operatorTable: &mut Table<address, bool>, operator:address, status:bool){
        if(contains(operatorTable, operator)){
            assert!(status == false, 7);
            remove(operatorTable, operator); 
        } else {
            assert!(status == true, 8);
            add(operatorTable, operator, true);
        };

        emit(OperatorUpdateEvent {
            account: operator,
            status: status
        });
    }

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

        let positions = table::new<address, UserPosition>(ctx);

        let checks = evaluator::initTradeChecks(
            minPrice,
            maxPrice,
            tickSize,
            minQty,
            maxQtyLimit,
            maxQtyMarket,
            stepSize,
            mtbLong,
            mtbShort
            );

        let perpetual = Perpetual {
            id: id,
            name: string::utf8(name),
            checks,
            initialMarginRequired,
            maintenanceMarginRequired,
            makerFee,
            takerFee,
            positions,
        };

        emit(PerpetualCreationEvent {
            id: perpID,
            name: perpetual.name,
            checks,
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
        evaluator::setMinPrice(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, minPrice);
    }   

    /**
     * Updates maximum price of the perpetual 
     * Only Admin can update price
     */
    public entry fun setMaxPrice( _: &AdminCap, perpetual: &mut Perpetual, maxPrice: u64){
        evaluator::setMaxPrice(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, maxPrice);
    }   

    /**
     * Updates step size of the perpetual 
     * Only Admin can update size
     */
    public entry fun setStepSize( _: &AdminCap, perpetual: &mut Perpetual, stepSize: u64){
        evaluator::setStepSize(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, stepSize);
    }   

    /**
     * Updates tick size of the perpetual 
     * Only Admin can update size
     */
    public entry fun setTickSize( _: &AdminCap, perpetual: &mut Perpetual, tickSize: u64){
        evaluator::setTickSize(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, tickSize);
    }   

    /**
     * Updates market take bound (long) of the perpetual 
     * Only Admin can update MTB long
     */
    public entry fun setMtbLong( _: &AdminCap, perpetual: &mut Perpetual, mtbLong: u64){
        evaluator::setMtbLong(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, mtbLong);
    }  

    /**
     * Updates market take bound (short) of the perpetual 
     * Only Admin can update MTB short
     */
    public entry fun setMtbShort( _: &AdminCap, perpetual: &mut Perpetual, mtbShort: u64){
        evaluator::setMtbShort(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, mtbShort);
    }   

    /**
     * Updates maximum quantity for limit orders of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun setMaxQtyLimit( _: &AdminCap, perpetual: &mut Perpetual, quantity: u64){
        evaluator::setMaxQtyLimit(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, quantity);
    }   

    /**
     * Updates maximum quantity for market orders of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun setMaxQtyMarket( _: &AdminCap, perpetual: &mut Perpetual, quantity: u64){
        evaluator::setMaxQtyMarket(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, quantity);
    }  

    /**
     * Updates minimum quantity of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun setMinQty( _: &AdminCap, perpetual: &mut Perpetual, quantity: u64){
        evaluator::setMinQty(object::uid_to_inner(&perpetual.id), &mut perpetual.checks, quantity);
    }   





    /**
     * Creates a new position and adds to perpetual
     */
    public entry fun createPosition(perp: &mut Perpetual,  ctx: &mut TxContext){
            let account = tx_context::sender(ctx);
            let perpID = object::uid_to_inner(&perp.id);

            // position for the account should not exist in table
            assert!(contains(&mut perp.positions, account) == false, 6);

            let userPosition = position::initPosition(perpID, account);            
            add(&mut perp.positions, account, userPosition);
    }   

    // TODO for testing purpose only, will be removed
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

