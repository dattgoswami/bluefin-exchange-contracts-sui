
module bluefin_foundation::perpetual {
    
    use sui::clock::{Self, Clock};
    use sui::object::{Self, ID, UID};
    use std::string::{Self, String};
    use sui::tx_context::{TxContext};
    use sui::table::{Self, Table};
    use sui::event::{emit};
    use sui::transfer;
    use sui::math::pow;

    // custom modules
    use bluefin_foundation::position::{UserPosition};
    use bluefin_foundation::evaluator::{Self, TradeChecks};
    use bluefin_foundation::funding_rate::{Self, FundingRate, FundingIndex};
    use bluefin_foundation::roles::{Self, ExchangeAdminCap, ExchangeGuardianCap, FundingRateCap, CapabilitiesSafe};
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::library::{Self};

    // pyth
    use Pyth::price_info::{PriceInfoObject as PythFeeder};

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
        checks:TradeChecks,
        funding: FundingRate
    }

    struct SpecialFee has copy, drop, store {
        status: bool,
        makerFee: u128,
        takerFee: u128
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

    struct DelistEvent has copy, drop {
        id: ID,
        delistingPrice: u128
    }

    struct TradingPermissionStatusUpdate has drop, copy {
        status: bool
    }

    struct MMRUpdateEvent has copy, drop {
        id: ID,
        mmr: u128
    }

    struct IMRUpdateEvent has copy, drop {
        id: ID,
        imr: u128
    }

    struct SpecialFeeEvent has copy, drop {
        perp: ID,
        account:address,
        status: bool,
        makerFee: u128,
        takerFee: u128
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
        // time at which trading will start for perpetual
        startTime: u64,
        /// trade checks
        checks: TradeChecks,
        /// table containing user positions for this market/perpetual
        positions: Table<address, UserPosition>,
        /// table containing special fee for users
        specialFee: Table<address, SpecialFee>,
        /// price oracle
        priceOracle: u128,
        /// Funding Rate
        funding: FundingRate,

        priceIdentifierId: vector<u8>
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
        maxAllowedFR: u128,
        startTime: u64,
        maxAllowedOIOpen: vector<u128>,
        positions: Table<address,UserPosition>,
        specialFee: Table<address,SpecialFee>,

        priceIdentifierId: vector<u8>,

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

        
        let priceOracle = 0;

        let funding = funding_rate::initialize(startTime, maxAllowedFR);

        assert!(mmr > 0, error::maintenance_margin_must_be_greater_than_zero());
        assert!(mmr <= imr, error::maintenance_margin_must_be_less_than_or_equal_to_imr());

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
            startTime,
            checks,
            positions,
            specialFee,
            priceOracle,
            funding,
            priceIdentifierId,
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
            checks,
            funding 
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

    public fun fundingRate(perp:&Perpetual):FundingRate{
        return perp.funding
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

    public fun priceOracle(perp:&Perpetual):u128{
        return perp.priceOracle
    }

    public fun globalIndex(perp:&Perpetual): FundingIndex{
        return funding_rate::index(perp.funding)
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

    public fun startTime(perp: &Perpetual): u64{
        return perp.startTime
    }

    public fun priceIdenfitier(perp: &Perpetual): vector<u8>{
        return perp.priceIdentifierId
    }

    // returns fee to be applied to the user
    public fun get_fee(user:address, perp: &Perpetual, isMaker: bool): u128{
        
        let feeAmount = if (isMaker) { perp.makerFee } else { perp.takerFee };

        if(table::contains(&perp.specialFee, user)){
            let fee = table::borrow(&perp.specialFee, user);
            if(fee.status == true){
                feeAmount = if (isMaker) { fee.makerFee } else { fee.takerFee };
            };
        };

        return feeAmount
    }


    //===========================================================//
    //                         SETTERS                           //
    //===========================================================//

    public entry fun set_insurance_pool_percentage(_: &ExchangeAdminCap, perp: &mut Perpetual,  percentage: u128){
        percentage = percentage / library::base_uint();
        
        assert!(
            percentage <= library::base_uint(), 
            error::can_not_be_greater_than_hundred_percent());

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

        // convert price to base 1e9;
        price = price / library::base_uint();

        assert!(!perp.delisted, error::perpetual_has_been_already_de_listed());

        // verify that price conforms to tick size
        evaluator::verify_price_checks(perp.checks, price);

        perp.delisted = true;
        perp.delistingPrice = price;

        emit(DelistEvent{
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
            minPrice / library::base_uint());
    }   

    /** Updates maximum price of the perpetual 
     * Only Admin can update price
     */
    public entry fun set_max_price( _: &ExchangeAdminCap, perp: &mut Perpetual, maxPrice: u128){
        evaluator::set_max_price(object::uid_to_inner(&perp.id), &mut perp.checks, maxPrice / library::base_uint());
    }   

    /**
     * Updates step size of the perpetual 
     * Only Admin can update size
     */
    public entry fun set_step_size( _: &ExchangeAdminCap, perp: &mut Perpetual, stepSize: u128){
        evaluator::set_step_size(object::uid_to_inner(&perp.id), &mut perp.checks, stepSize / library::base_uint());
    }   

    /**
     * Updates tick size of the perpetual 
     * Only Admin can update size
     */
    public entry fun set_tick_size( _: &ExchangeAdminCap, perp: &mut Perpetual, tickSize: u128){
        evaluator::set_tick_size(object::uid_to_inner(&perp.id), &mut perp.checks, tickSize / library::base_uint());
    }   

    /**
     * Updates market take bound (long) of the perpetual 
     * Only Admin can update MTB long
     */
    public entry fun set_mtb_long( _: &ExchangeAdminCap, perp: &mut Perpetual, mtbLong: u128){
        evaluator::set_mtb_long(object::uid_to_inner(&perp.id), &mut perp.checks, mtbLong / library::base_uint());
    }  

    /**
     * Updates market take bound (short) of the perpetual 
     * Only Admin can update MTB short
     */
    public entry fun set_mtb_short( _: &ExchangeAdminCap, perp: &mut Perpetual, mtbShort: u128){
        evaluator::set_mtb_short(object::uid_to_inner(&perp.id), &mut perp.checks, mtbShort / library::base_uint());
    }   

    /**
     * Updates maximum quantity for limit orders of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun set_max_qty_limit( _: &ExchangeAdminCap, perp: &mut Perpetual, quantity: u128){
        evaluator::set_max_qty_limit(object::uid_to_inner(&perp.id), &mut perp.checks, quantity / library::base_uint());
    }   

    /**
     * Updates maximum quantity for market orders of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun set_max_qty_market( _: &ExchangeAdminCap, perp: &mut Perpetual, quantity: u128){
        evaluator::set_max_qty_market(object::uid_to_inner(&perp.id), &mut perp.checks, quantity / library::base_uint());
    }  

    /**
     * Updates minimum quantity of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun set_min_qty( _: &ExchangeAdminCap, perp: &mut Perpetual, quantity: u128){
        evaluator::set_min_qty(object::uid_to_inner(&perp.id), &mut perp.checks, quantity / library::base_uint());
    }   

    /**
     * updates max allowed oi open for selected mro
     * Only Admin can update max allowed OI open
     */
    public entry fun set_max_oi_open( _: &ExchangeAdminCap, perp: &mut Perpetual, maxLimit: vector<u128>){


        // convert max oi opens to 1e9
        let maxOIOpen = library::to_1x9_vec(maxLimit);

        evaluator::set_max_oi_open(object::uid_to_inner(&perp.id), &mut perp.checks, maxOIOpen);
    }


    /*
     * Updates max allowed funding rate to the provided one
     */
    public entry fun set_max_allowed_funding_rate(_: &ExchangeAdminCap, perp: &mut Perpetual,  maxAllowedFR: u128){
        let perpID = object::uid_to_inner(id(perp));
        funding_rate::set_max_allowed_funding_rate(
            &mut perp.funding, 
            maxAllowedFR / library::base_uint(), 
            perpID);
    }

    /*
     * Allows funding rate operator to set funding rate for current window
     */
    public entry fun set_funding_rate(clock: &Clock, safe: &CapabilitiesSafe, cap: &FundingRateCap, perp: &mut Perpetual, rate: u128, sign: bool, price_oracle: &PythFeeder){
        // verify that the incoming oracle object belongs to the provided perpetual and 
        // update oracle price on the perp and also verig
        update_oracle_price(perp, price_oracle);

        update_global_index(clock, perp);

        funding_rate::set_funding_rate(
            safe,
            cap,
            &mut perp.funding,
            rate / library::base_uint(),
            sign,
            clock::timestamp_ms(clock),
            object::uid_to_inner(&perp.id));
    }

    /**
     * Updates maintenance margin required for the perpetual 
     * Only Admin can update mmr
     */
    public entry fun set_maintenance_margin_required( _: &ExchangeAdminCap, perp: &mut Perpetual, newMMR: u128){
        
        newMMR = newMMR / library::base_uint();

        assert!(newMMR > 0, error::maintenance_margin_must_be_greater_than_zero());
        assert!(newMMR <= perp.imr, error::maintenance_margin_must_be_less_than_or_equal_to_imr());

        perp.mmr = newMMR;

        emit(MMRUpdateEvent{
            id: object::uid_to_inner(id(perp)),
            mmr: newMMR
        });

    }   

    /**
     * Updates initial margin required for the perpetual 
     * Only Admin can update imr
     */
    public entry fun set_initial_margin_required( _: &ExchangeAdminCap, perp: &mut Perpetual, newIMR: u128){
        
        newIMR = newIMR / library::base_uint();

        assert!(newIMR >= perp.mmr, error::initial_margin_must_be_greater_than_or_equal_to_mmr());

        perp.imr = newIMR;

        emit(IMRUpdateEvent{
            id: object::uid_to_inner(id(perp)),
            imr: newIMR
        });

    }   


    fun update_global_index(clock: &Clock, perp: &mut Perpetual){
        let perpID = object::uid_to_inner(&perp.id);
        // update global index based on last fuding rate
        let index = funding_rate::compute_new_global_index(clock, perp.funding, priceOracle(perp));
        funding_rate::set_global_index(&mut perp.funding, index, perpID);

    }

    /*
     * @notice allows exchange admin to set a specific maker/taker tx fee for a user
     * @param perp: Perpetual for which to set specific maker/taker fee
     * @param account: address of the user
     * @param status: staus indicating if the maker/taker fee are to be applied or not
     * @param makerFee: the maker fee to be charged from user on each tx
     * @param takerFee: the taker fee to be charged from user on each tx
     */
    public entry fun set_special_fee(_: &ExchangeAdminCap, perp: &mut Perpetual, account: address, status:bool, makerFee: u128, takerFee:u128){

        let specialFee = SpecialFee {
                status,
                makerFee,
                takerFee
            };

        // if table already has an entry update it
        if(table::contains(&perp.specialFee, account)){

            let entry = table::borrow_mut(&mut perp.specialFee, account);
            *entry = specialFee;

        } else {
            // if table does not contain entry create it
            table::add(
                &mut perp.specialFee, 
                account, 
                specialFee     
            );
        };

        emit(SpecialFeeEvent{
            perp: object::uid_to_inner(id(perp)),
            account,
            status,
            makerFee,
            takerFee
        });
    }



    //===========================================================//
    //                         ORACLE PRICE                      //
    //===========================================================//

    public (friend) fun update_oracle_price(perp: &mut Perpetual, price_oracle: &PythFeeder){

        // verify that the incoming oracle object belongs to the provided perpetual        
        assert!(
            library::get_price_identifier(price_oracle) == priceIdenfitier(perp), 
            error::wrong_price_identifier());
        
        // update oracle price on the perp
        let oraclePrice = library::get_oracle_price(price_oracle);
        let expo = (pow(10,(library::get_oracle_base(price_oracle) as u8)) as u128);
        perp.priceOracle = library::base_div(oraclePrice, expo);

    }


}