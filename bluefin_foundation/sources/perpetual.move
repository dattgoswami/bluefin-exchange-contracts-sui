
module bluefin_foundation::perpetual {

    use sui::object::{Self, ID, UID};
    use std::string::{Self, String};
    use sui::tx_context::{TxContext};
    use sui::table::{Table};
    use sui::event::{emit};
    use sui::transfer;

    // custom modules
    use bluefin_foundation::position::{UserPosition};
    use bluefin_foundation::price_oracle::{Self, PriceOracle};
    use bluefin_foundation::evaluator::{Self, TradeChecks};
    use bluefin_foundation::roles::{Self, ExchangeAdminCap, PriceOracleOperatorCap, ExchangeGuardianCap, CapabilitiesSafe};
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::library::{Self};

    //friend modules
    friend bluefin_foundation::exchange;
    friend bluefin_foundation::isolated_trading;
    friend bluefin_foundation::isolated_liquidation;
    friend bluefin_foundation::isolated_adl;
    
    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct PerpetualCreationEvent has copy, drop {
        id: ID,
        name: String,
        imr: u128,
        mmr: u128,
        makerFee: u128,
        takerFee: u128,
        insurancePoolRatio: u128,
        insurancePool: address,
        feePool: address,
        checks:TradeChecks
    }

    struct InsurancePoolRatioUpdateEvent has copy, drop {
        id: ID,
        ratio: u128
    }

    struct InsurancePoolAccountUpdateEvent has copy, drop {
        id: ID,
        account: address
    }

    struct FeePoolAccountUpdateEvent has copy, drop {
        id: ID,
        account: address
    }

    struct PerpetualDelistEvent has copy, drop {
        id: ID,
        delistingPrice: u128
    }

    struct TradingPermissionStatusUpdate has drop, copy {
        status: bool
    }


    //===========================================================//
    //                           STORAGE                         //
    //===========================================================//

    struct Perpetual has key, store {
        id: UID,
        /// name of perpetual
        name: String,
        /// imr: the initial margin collateralization percentage
        imr: u128,
        /// mmr: the minimum collateralization percentage
        mmr: u128,
        /// default maker order fee for this Perpetual
        makerFee: u128,
        /// default taker order fee for this Perpetual
        takerFee: u128,
        /// percentage of liquidaiton premium goes to insurance pool
        insurancePoolRatio: u128, 
        /// address of insurance pool
        insurancePool: address,
        /// fee pool address
        feePool: address,
        /// delist status
        delisted: bool,
        /// the price at which trades will be executed after delisting
        delistingPrice: u128,
        /// is trading allowed
        isTradingPermitted:bool,
        /// trade checks
        checks: TradeChecks,
        /// table containing user positions for this market/perpetual
        positions: Table<address, UserPosition>,
        /// price oracle
        priceOracle: PriceOracle,

    }

    //===========================================================//
    //                      FRIEND FUNCTIONS                     //
    //===========================================================//

    public (friend) fun initialize(
        name:vector<u8>, 
        imr: u128,
        mmr: u128,
        makerFee: u128,
        takerFee: u128,
        insurancePoolRatio: u128,
        insurancePool: address,
        feePool: address,
        minPrice: u128,
        maxPrice: u128,
        tickSize: u128,
        minQty: u128,
        maxQtyLimit: u128,
        maxQtyMarket: u128,
        stepSize: u128,
        mtbLong: u128,
        mtbShort: u128,
        maxAllowedPriceDiffInOP: u128, 
        maxAllowedOIOpen: vector<u128>,
        positions: Table<address,UserPosition>,

        ctx: &mut TxContext
        ): ID{
        
        let id = object::new(ctx);
        let perpID =  object::uid_to_inner(&id);

        let checks = evaluator::initialize(
            minPrice,
            maxPrice,
            tickSize,
            minQty,
            maxQtyLimit,
            maxQtyMarket,
            stepSize,
            mtbLong,
            mtbShort,
            maxAllowedOIOpen
        );

        let priceOracle = price_oracle::initialize(
            perpID, 
            maxAllowedPriceDiffInOP,
        );

        let perp = Perpetual {
            id,
            name: string::utf8(name),
            imr,
            mmr,
            makerFee,
            takerFee,
            insurancePoolRatio,
            insurancePool,
            feePool,
            delisted: false,
            delistingPrice: 0,
            isTradingPermitted:true,
            checks,
            positions,
            priceOracle
        };

        emit(PerpetualCreationEvent {
            id: perpID,
            name: perp.name,
            imr,
            mmr,
            makerFee,
            takerFee,
            insurancePoolRatio,
            insurancePool,
            feePool,
            checks
        });
        
        transfer::share_object(perp);

        return perpID
    }

    public (friend) fun positions(perp:&mut Perpetual):&mut Table<address,UserPosition>{
        return &mut perp.positions
    }


    //===========================================================//
    //                      GUARDIAN METHODS
    //===========================================================//

    public entry fun set_trading_permit(safe: &CapabilitiesSafe, guardian: &ExchangeGuardianCap, perp: &mut Perpetual, isTradingPermitted: bool) {

        // validate guardian
        roles::check_guardian_validity(safe, guardian);

        // setting the withdrawal allowed flag
        perp.isTradingPermitted = isTradingPermitted;

        emit(TradingPermissionStatusUpdate{status: isTradingPermitted});
    }

    //===========================================================//
    //                          ACCESSORS                        //
    //===========================================================//

    public fun id(perp:&Perpetual):&UID{
        return &perp.id
    }

    public fun name(perp:&Perpetual):&String{
        return &perp.name
    }

    public fun checks(perp:&Perpetual):TradeChecks{
        return perp.checks
    }

    public fun imr(perp:&Perpetual):u128{
        return perp.imr
    }

    public fun mmr(perp:&Perpetual):u128{
        return perp.mmr
    }

    public fun makerFee(perp:&Perpetual):u128{
        return perp.makerFee
    }

    public fun takerFee(perp:&Perpetual):u128{
        return perp.takerFee
    }

    public fun poolPercentage(perp:&Perpetual): u128{
        return perp.insurancePoolRatio
    }

    public fun insurancePool(perp:&Perpetual): address{
        return perp.insurancePool
    }

    public fun feePool(perp:&Perpetual): address{
        return perp.feePool
    }

    public fun priceOracle(perp:&Perpetual):PriceOracle{
        return perp.priceOracle
    }

    public fun oraclePrice(perp:&Perpetual):u128{
        return price_oracle::price(perp.priceOracle)
    }

    public fun is_trading_permitted(perp: &mut Perpetual) : bool {
        perp.isTradingPermitted
    }
    
    public fun delisted(perp: &Perpetual): bool{
        return perp.delisted
    }

    public fun delistingPrice(perp: &Perpetual): u128{
        return perp.delistingPrice
    }


    //===========================================================//
    //                         SETTERS                           //
    //===========================================================//

    public entry fun set_insurance_pool_percentage(_: &ExchangeAdminCap, perp: &mut Perpetual,  percentage: u128){
        assert!(percentage <= library::base_uint(), error::can_not_be_greater_than_hundred_percent());
        let perpID = object::uid_to_inner(id(perp));
        perp.insurancePoolRatio = percentage;

        emit(InsurancePoolRatioUpdateEvent {
            id: perpID,
            ratio: percentage
        });
    }

    public entry fun set_fee_pool_address(_: &ExchangeAdminCap, perp: &mut Perpetual, account: address){
        assert!(account != @0, error::address_cannot_be_zero());
        let perpID = object::uid_to_inner(id(perp));
        perp.feePool = account;
        
        emit(FeePoolAccountUpdateEvent {
            id: perpID,
            account
        });
    }

    public entry fun set_insurance_pool_address(_: &ExchangeAdminCap, perp: &mut Perpetual, account: address){
        assert!(account != @0, error::address_cannot_be_zero());
        let perpID = object::uid_to_inner(id(perp));
        perp.insurancePool = account;
        
        emit(InsurancePoolAccountUpdateEvent {
            id: perpID,
            account
        });
    }


    public entry fun delist_perpetual(_: &ExchangeAdminCap, perp: &mut Perpetual, price: u128){


        assert!(!perp.delisted, error::perpetual_has_been_already_de_listed());

        // TODO update global index over here

        // verify that price conforms to tick size
        evaluator::verify_price_checks(perp.checks, price);

        perp.delisted = true;
        perp.delistingPrice = price;

        emit(PerpetualDelistEvent{
            id: object::uid_to_inner(id(perp)),
            delistingPrice: price
        })


    }

     /**
     * Updates minimum price of the perpetual 
     * Only Admin can update price
     */
    public entry fun set_min_price( _: &ExchangeAdminCap, perp: &mut Perpetual, minPrice: u128){
        evaluator::set_min_price(
            object::uid_to_inner(&perp.id), 
            &mut perp.checks, 
            minPrice);
    }   

    /** Updates maximum price of the perpetual 
     * Only Admin can update price
     */
    public entry fun set_max_price( _: &ExchangeAdminCap, perp: &mut Perpetual, maxPrice: u128){
        evaluator::set_max_price(object::uid_to_inner(&perp.id), &mut perp.checks, maxPrice);
    }   

    /**
     * Updates step size of the perpetual 
     * Only Admin can update size
     */
    public entry fun set_step_size( _: &ExchangeAdminCap, perp: &mut Perpetual, stepSize: u128){
        evaluator::set_step_size(object::uid_to_inner(&perp.id), &mut perp.checks, stepSize);
    }   

    /**
     * Updates tick size of the perpetual 
     * Only Admin can update size
     */
    public entry fun set_tick_size( _: &ExchangeAdminCap, perp: &mut Perpetual, tickSize: u128){
        evaluator::set_tick_size(object::uid_to_inner(&perp.id), &mut perp.checks, tickSize);
    }   

    /**
     * Updates market take bound (long) of the perpetual 
     * Only Admin can update MTB long
     */
    public entry fun set_mtb_long( _: &ExchangeAdminCap, perp: &mut Perpetual, mtbLong: u128){
        evaluator::set_mtb_long(object::uid_to_inner(&perp.id), &mut perp.checks, mtbLong);
    }  

    /**
     * Updates market take bound (short) of the perpetual 
     * Only Admin can update MTB short
     */
    public entry fun set_mtb_short( _: &ExchangeAdminCap, perp: &mut Perpetual, mtbShort: u128){
        evaluator::set_mtb_short(object::uid_to_inner(&perp.id), &mut perp.checks, mtbShort);
    }   

    /**
     * Updates maximum quantity for limit orders of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun set_max_qty_limit( _: &ExchangeAdminCap, perp: &mut Perpetual, quantity: u128){
        evaluator::set_max_qty_limit(object::uid_to_inner(&perp.id), &mut perp.checks, quantity);
    }   

    /**
     * Updates maximum quantity for market orders of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun set_max_qty_market( _: &ExchangeAdminCap, perp: &mut Perpetual, quantity: u128){
        evaluator::set_max_qty_market(object::uid_to_inner(&perp.id), &mut perp.checks, quantity);
    }  

    /**
     * Updates minimum quantity of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun set_min_qty( _: &ExchangeAdminCap, perp: &mut Perpetual, quantity: u128){
        evaluator::set_min_qty(object::uid_to_inner(&perp.id), &mut perp.checks, quantity);
    }   

    /**
     * updates max allowed oi open for selected mro
     * Only Admin can update max allowed OI open
     */
    public entry fun set_max_oi_open( _: &ExchangeAdminCap, perp: &mut Perpetual, maxLimit: vector<u128>){
        evaluator::set_max_oi_open(object::uid_to_inner(&perp.id), &mut perp.checks, maxLimit);
    }

    /*
     * Sets PriceOracle  
     */
    public entry fun set_oracle_price(safe: &CapabilitiesSafe, cap: &PriceOracleOperatorCap, perp: &mut Perpetual, price: u128){
        let perpID = object::uid_to_inner(&perp.id);
        price_oracle::set_oracle_price(
            safe,
            cap, 
            &mut perp.priceOracle,
            perpID, 
            price
            );
    }

    /*
     * Sets Max difference allowed in percentage between New Oracle Price & Old Oracle Price
     */
    public entry fun set_oracle_price_max_allowed_diff(_: &ExchangeAdminCap, perp: &mut Perpetual, maxAllowedPriceDifference: u128){
        price_oracle::set_oracle_price_max_allowed_diff(
            object::uid_to_inner(&perp.id),
            &mut perp.priceOracle,
            maxAllowedPriceDifference);
    }
}