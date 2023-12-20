
module bluefin_foundation::perpetual {
    
    use sui::clock::{Self, Clock};
    use sui::object::{Self, ID, UID};
    use std::string::{Self, String};
    use sui::tx_context::{TxContext};
    use sui::table::{Self, Table};
    use sui::event::{emit};
    use sui::transfer;
    use sui::math::pow;
    use std::vector;

    // custom modules
    use bluefin_foundation::position::{Self, UserPosition};
    use bluefin_foundation::evaluator::{Self, TradeChecks};
    use bluefin_foundation::funding_rate::{Self, FundingRate, FundingIndex};
    use bluefin_foundation::roles::{Self, ExchangeAdminCap, ExchangeGuardianCap, FundingRateCap, CapabilitiesSafe, CapabilitiesSafeV2};
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::library::{Self};
    use bluefin_foundation::margin_bank::{Self, Bank, BankV2};

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
    
    struct PriceOracleIdentifierUpdateEvent has copy, drop{
        perp: ID,
        identifier: vector<u8>
    }

    struct MakerFeeUpdateEvent has copy, drop {
        perp: ID,
        makerFee: u128
    }

    struct TakerFeeUpdateEvent has copy, drop {
        perp: ID,
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

    struct PerpetualV2 has key {
        id: UID,

        version: u64,

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


    struct SpecialFee has copy, drop, store {
        status: bool,
        makerFee: u128,
        takerFee: u128
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
        priceIdentifierId: vector<u8>,

        ctx: &mut TxContext
        ): ID{

        let positions = table::new<address, UserPosition>(ctx);

        let specialFee = table::new<address, SpecialFee>(ctx);

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

        let perp = PerpetualV2 {
            id,
            version: roles::get_version(),
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

    public (friend) fun positions(perp:&mut PerpetualV2):&mut Table<address,UserPosition>{
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

    public entry fun set_trading_permit_v2(safe: &CapabilitiesSafeV2, guardian: &ExchangeGuardianCap, perp: &mut PerpetualV2, isTradingPermitted: bool) {

        roles::validate_safe_version(safe);
        assert!(perp.version == roles::get_version(), error::object_version_mismatch());

        // validate guardian
        roles::check_guardian_validity_v2(safe, guardian);

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
    //                      ACCESSORS (V2)                       //
    //===========================================================//

    public fun id_v2(perp:&PerpetualV2):&UID{
        return &perp.id
    }

    public fun name_v2(perp:&PerpetualV2):&String{
        return &perp.name
    }

    public fun checks_v2(perp:&PerpetualV2):TradeChecks{
        return perp.checks
    }

    public fun imr_v2(perp:&PerpetualV2):u128{
        return perp.imr
    }

    public fun mmr_v2(perp:&PerpetualV2):u128{
        return perp.mmr
    }

    public fun makerFee_v2(perp:&PerpetualV2):u128{
        return perp.makerFee
    }

    public fun takerFee_v2(perp:&PerpetualV2):u128{
        return perp.takerFee
    }

    public fun fundingRate_v2(perp:&PerpetualV2):FundingRate{
        return perp.funding
    }

    public fun poolPercentage_v2(perp:&PerpetualV2): u128{
        return perp.insurancePoolRatio
    }

    public fun insurancePool_v2(perp:&PerpetualV2): address{
        return perp.insurancePool
    }

    public fun feePool_v2(perp:&PerpetualV2): address{
        return perp.feePool
    }

    public fun priceOracle_v2(perp:&PerpetualV2):u128{
        return perp.priceOracle
    }

    public fun globalIndex_v2(perp:&PerpetualV2): FundingIndex{
        return funding_rate::index(perp.funding)
    }

    public fun is_trading_permitted_v2(perp: &mut PerpetualV2) : bool {
        perp.isTradingPermitted
    }
    
    public fun delisted_v2(perp:&PerpetualV2): bool{
        return perp.delisted
    }

    public fun delistingPrice_v2(perp:&PerpetualV2): u128{
        return perp.delistingPrice
    }

    public fun startTime_v2(perp:&PerpetualV2): u64{
        return perp.startTime
    }

    public fun priceIdenfitier_v2(perp:&PerpetualV2): vector<u8>{
        return perp.priceIdentifierId
    }

    /// returns fee to be applied to the user
    public fun get_fee_v2(user:address, perp: &PerpetualV2, isMaker: bool): u128{
        
        let feeAmount = if (isMaker) { perp.makerFee } else { perp.takerFee };

        if(table::contains(&perp.specialFee, user)){
            let fee = table::borrow(&perp.specialFee, user);
            if(fee.status == true){
                feeAmount = if (isMaker) { fee.makerFee } else { fee.takerFee };
            };
        };

        return feeAmount
    }

    /// returns the version of perpetual object
    public fun get_version(perp: &PerpetualV2): u64{
        return perp.version
    }


    //===========================================================//
    //                         SETTERS                           //
    //===========================================================//

    public entry fun set_price_oracle_identifier(_: &ExchangeAdminCap, _: &mut Perpetual, _:vector<u8>){
    }

    public entry fun set_insurance_pool_percentage(_: &ExchangeAdminCap, _: &mut Perpetual,  _: u128){
    }

    public entry fun set_fee_pool_address(_: &ExchangeAdminCap, _: &mut Perpetual, _: address){
    }

    public entry fun set_insurance_pool_address(_: &ExchangeAdminCap, _: &mut Perpetual, _: address){
    }


    public entry fun delist_perpetual(_: &ExchangeAdminCap, _: &mut Perpetual, _: u128){
    }

    public entry fun set_min_price( _: &ExchangeAdminCap, _: &mut Perpetual, _: u128){
    }   

    public entry fun set_max_price( _: &ExchangeAdminCap, _: &mut Perpetual, _: u128){
    }   

    public entry fun set_step_size( _: &ExchangeAdminCap, _: &mut Perpetual, _: u128){
    }   

    public entry fun set_tick_size( _: &ExchangeAdminCap, _: &mut Perpetual, _: u128){
    }   

    public entry fun set_mtb_long( _: &ExchangeAdminCap, _: &mut Perpetual, _: u128){
    }  

    public entry fun set_mtb_short( _: &ExchangeAdminCap, _: &mut Perpetual, _: u128){
    }   

    public entry fun set_max_qty_limit( _: &ExchangeAdminCap, _: &mut Perpetual, _: u128){
    }   

    public entry fun set_max_qty_market( _: &ExchangeAdminCap, _: &mut Perpetual, _: u128){
    }  

    public entry fun set_min_qty( _: &ExchangeAdminCap, _: &mut Perpetual, _: u128){
    }   
    public entry fun set_max_oi_open( _: &ExchangeAdminCap, _: &mut Perpetual, _: vector<u128>){
    }

    public entry fun set_max_allowed_funding_rate(_: &ExchangeAdminCap, _: &mut Perpetual,  _: u128){
    }

    public entry fun set_funding_rate(_: &Clock, _: &CapabilitiesSafe, _: &FundingRateCap, _: &mut Perpetual, _: u128, _: bool, _: &PythFeeder){
    }

    public entry fun set_maintenance_margin_required( _: &ExchangeAdminCap, _: &mut Perpetual, _: u128){
    }   

    public entry fun set_initial_margin_required( _: &ExchangeAdminCap, _: &mut Perpetual, _: u128){
    }   

    public entry fun set_special_fee(_: &ExchangeAdminCap, _: &mut Perpetual, _: address, _:bool, _: u128, _:u128){

    }

    
    //===========================================================//
    //                      SETTERS (V2)                         //
    //===========================================================//


    /**
     * Allows exchange admin to update the price oracle identifier id for a perpetual
     * @param perp: Perpetual for which the oracle feed id is to be updated
     * @param new_identifier_id: New price oracle identifier/feed id to be saved on perpetual
     */
    public entry fun set_price_oracle_identifier_v2(_: &ExchangeAdminCap, perp: &mut PerpetualV2, new_identifier_id:vector<u8>){

        assert!(perp.version == roles::get_version(), error::object_version_mismatch());

        perp.priceIdentifierId = new_identifier_id;

        emit(PriceOracleIdentifierUpdateEvent{
                perp: object::uid_to_inner(id_v2(perp)),
                identifier: new_identifier_id
            })
    }

    public entry fun set_insurance_pool_percentage_v2(_: &ExchangeAdminCap, perp: &mut PerpetualV2,  percentage: u128){

        assert!(perp.version == roles::get_version(), error::object_version_mismatch());

        percentage = percentage / library::base_uint();
        
        assert!(
            percentage <= library::base_uint(), 
            error::can_not_be_greater_than_hundred_percent());

        let perpID = object::uid_to_inner(id_v2(perp));
        perp.insurancePoolRatio = percentage;

        emit(InsurancePoolRatioUpdateEvent {
            id: perpID,
            ratio: percentage
        });
    }

    
    public entry fun set_fee_pool_address_v2<T>(_: &ExchangeAdminCap, bank: &mut BankV2<T>, perp: &mut PerpetualV2, account: address){
        
        assert!(perp.version == roles::get_version(), error::object_version_mismatch());

        assert!(account != @0, error::address_cannot_be_zero());
        let perpID = object::uid_to_inner(id_v2(perp));
        perp.feePool = account;

        margin_bank::initialize_account(
            margin_bank::mut_accounts_v2(bank), 
            perp.feePool,
        );

        emit(FeePoolAccountUpdateEvent {
            id: perpID,
            account
        });
    }

    public entry fun set_insurance_pool_address_v2<T>(_: &ExchangeAdminCap, bank: &mut BankV2<T>, perp: &mut PerpetualV2, account: address){
        
        assert!(perp.version == roles::get_version(), error::object_version_mismatch());

        assert!(account != @0, error::address_cannot_be_zero());
        let perpID = object::uid_to_inner(id_v2(perp));
        perp.insurancePool = account;
        
        margin_bank::initialize_account(
            margin_bank::mut_accounts_v2(bank), 
            perp.insurancePool,
        );

        emit(InsurancePoolAccountUpdateEvent {
            id: perpID,
            account
        });
    }


    public entry fun delist_perpetual_v2(_: &ExchangeAdminCap, perp: &mut PerpetualV2, price: u128){

        assert!(perp.version == roles::get_version(), error::object_version_mismatch());

        // convert price to base 1e9;
        price = price / library::base_uint();

        assert!(!perp.delisted, error::perpetual_has_been_already_de_listed());

        // verify that price conforms to tick size
        evaluator::verify_price_checks(perp.checks, price);

        perp.delisted = true;
        perp.delistingPrice = price;

        emit(DelistEvent{
            id: object::uid_to_inner(id_v2(perp)),
            delistingPrice: price
        })

    }

     /**
     * Updates minimum price of the perpetual 
     * Only Admin can update price
     */
    public entry fun set_min_price_v2( _: &ExchangeAdminCap, perp: &mut PerpetualV2, minPrice: u128){

        assert!(perp.version == roles::get_version(), error::object_version_mismatch());

        evaluator::set_min_price(
            object::uid_to_inner(&perp.id), 
            &mut perp.checks, 
            minPrice / library::base_uint());
    }   

    /** Updates maximum price of the perpetual 
     * Only Admin can update price
     */
    public entry fun set_max_price_v2( _: &ExchangeAdminCap, perp: &mut PerpetualV2, maxPrice: u128){
        assert!(perp.version == roles::get_version(), error::object_version_mismatch());
        evaluator::set_max_price(object::uid_to_inner(&perp.id), &mut perp.checks, maxPrice / library::base_uint());
    }   

    /**
     * Updates step size of the perpetual 
     * Only Admin can update size
     */
    public entry fun set_step_size_v2( _: &ExchangeAdminCap, perp: &mut PerpetualV2, stepSize: u128){
        assert!(perp.version == roles::get_version(), error::object_version_mismatch());
        evaluator::set_step_size(object::uid_to_inner(&perp.id), &mut perp.checks, stepSize / library::base_uint());
    }   

    /**
     * Updates tick size of the perpetual 
     * Only Admin can update size
     */
    public entry fun set_tick_size_v2( _: &ExchangeAdminCap, perp: &mut PerpetualV2, tickSize: u128){
        assert!(perp.version == roles::get_version(), error::object_version_mismatch());
        evaluator::set_tick_size(object::uid_to_inner(&perp.id), &mut perp.checks, tickSize / library::base_uint());
    }   

    /**
     * Updates market take bound (long) of the perpetual 
     * Only Admin can update MTB long
     */
    public entry fun set_mtb_long_V2( _: &ExchangeAdminCap, perp: &mut PerpetualV2, mtbLong: u128){
        assert!(perp.version == roles::get_version(), error::object_version_mismatch());
        evaluator::set_mtb_long(object::uid_to_inner(&perp.id), &mut perp.checks, mtbLong / library::base_uint());
    }  

    /**
     * Updates market take bound (short) of the perpetual 
     * Only Admin can update MTB short
     */
    public entry fun set_mtb_short_v2( _: &ExchangeAdminCap, perp: &mut PerpetualV2, mtbShort: u128){
        assert!(perp.version == roles::get_version(), error::object_version_mismatch());
        evaluator::set_mtb_short(object::uid_to_inner(&perp.id), &mut perp.checks, mtbShort / library::base_uint());
    }   

    /**
     * Updates maximum quantity for limit orders of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun set_max_qty_limit_v2( _: &ExchangeAdminCap, perp: &mut PerpetualV2, quantity: u128){
        assert!(perp.version == roles::get_version(), error::object_version_mismatch());
        evaluator::set_max_qty_limit(object::uid_to_inner(&perp.id), &mut perp.checks, quantity / library::base_uint());
    }   

    /**
     * Updates maximum quantity for market orders of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun set_max_qty_market_v2( _: &ExchangeAdminCap, perp: &mut PerpetualV2, quantity: u128){
        assert!(perp.version == roles::get_version(), error::object_version_mismatch());
        evaluator::set_max_qty_market(object::uid_to_inner(&perp.id), &mut perp.checks, quantity / library::base_uint());
    }  

    /**
     * Updates minimum quantity of the perpetual 
     * Only Admin can update max qty
     */
    public entry fun set_min_qty_v2( _: &ExchangeAdminCap, perp: &mut PerpetualV2, quantity: u128){
        assert!(perp.version == roles::get_version(), error::object_version_mismatch());
        evaluator::set_min_qty(object::uid_to_inner(&perp.id), &mut perp.checks, quantity / library::base_uint());
    }   

    /**
     * updates max allowed oi open for selected mro
     * Only Admin can update max allowed OI open
     */
    public entry fun set_max_oi_open_v2( _: &ExchangeAdminCap, perp: &mut PerpetualV2, maxLimit: vector<u128>){

        assert!(perp.version == roles::get_version(), error::object_version_mismatch());

        // convert max oi opens to 1e9
        let maxOIOpen = library::to_1x9_vec(maxLimit);

        evaluator::set_max_oi_open(object::uid_to_inner(&perp.id), &mut perp.checks, maxOIOpen);
    }


    /*
     * Updates max allowed funding rate to the provided one
     */
    public entry fun set_max_allowed_funding_rate_v2(_: &ExchangeAdminCap, perp: &mut PerpetualV2,  maxAllowedFR: u128){

        assert!(perp.version == roles::get_version(), error::object_version_mismatch());

        let perpID = object::uid_to_inner(id_v2(perp));
        funding_rate::set_max_allowed_funding_rate(
            &mut perp.funding, 
            maxAllowedFR / library::base_uint(), 
            perpID);
    }

    /*
     * Allows funding rate operator to set funding rate for current window
     */
    public entry fun set_funding_rate_v2(clock: &Clock, safe: &CapabilitiesSafeV2, cap: &FundingRateCap, perp: &mut PerpetualV2, rate: u128, sign: bool, price_oracle: &PythFeeder){
        
        assert!(perp.version == roles::get_version(), error::object_version_mismatch());
        roles::validate_safe_version(safe);

        // verify that the incoming oracle object belongs to the provided perpetual and 
        // update oracle price on the perp and also verig
        update_oracle_price(perp, price_oracle);

        let perpID = object::uid_to_inner(&perp.id);
        
        // update global index based on last fuding rate
        let index = funding_rate::compute_new_global_index(clock, perp.funding, priceOracle_v2(perp));
        funding_rate::set_global_index(&mut perp.funding, index, perpID);

        
        funding_rate::set_funding_rate(
            safe,
            cap,
            &mut perp.funding,
            rate / library::base_uint(),
            sign,
            clock::timestamp_ms(clock),
            perpID);
    }

    /**
     * Updates maintenance margin required for the perpetual 
     * Only Admin can update mmr
     */
    public entry fun set_maintenance_margin_required_v2( _: &ExchangeAdminCap, perp: &mut PerpetualV2, newMMR: u128){
        
        assert!(perp.version == roles::get_version(), error::object_version_mismatch());
        
        newMMR = newMMR / library::base_uint();

        assert!(newMMR > 0, error::maintenance_margin_must_be_greater_than_zero());
        assert!(newMMR <= perp.imr, error::maintenance_margin_must_be_less_than_or_equal_to_imr());

        perp.mmr = newMMR;

        emit(MMRUpdateEvent{
            id: object::uid_to_inner(id_v2(perp)),
            mmr: newMMR
        });

    }   

    /**
     * Updates initial margin required for the perpetual 
     * Only Admin can update imr
     */
    public entry fun set_initial_margin_required_v2( _: &ExchangeAdminCap, perp: &mut PerpetualV2, newIMR: u128){
        
        assert!(perp.version == roles::get_version(), error::object_version_mismatch());

        newIMR = newIMR / library::base_uint();

        assert!(newIMR >= perp.mmr, error::initial_margin_must_be_greater_than_or_equal_to_mmr());

        perp.imr = newIMR;

        emit(IMRUpdateEvent{
            id: object::uid_to_inner(id_v2(perp)),
            imr: newIMR
        });

    }   


    /*
     * @notice allows exchange admin to set a specific maker/taker tx fee for a user
     * @param perp: Perpetual for which to set specific maker/taker fee
     * @param account: address of the user
     * @param status: staus indicating if the maker/taker fee are to be applied or not
     * @param makerFee: the maker fee to be charged from user on each tx
     * @param takerFee: the taker fee to be charged from user on each tx
     */
    public entry fun set_special_fee_v2(_: &ExchangeAdminCap, perp: &mut PerpetualV2, account: address, status:bool, makerFee: u128, takerFee:u128){

        assert!(perp.version == roles::get_version(), error::object_version_mismatch());

        let specialFee = SpecialFee {
                status,
                makerFee: makerFee / library::base_uint(),
                takerFee: takerFee / library::base_uint()
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
            perp: object::uid_to_inner(id_v2(perp)),
            account,
            status,
            makerFee: specialFee.makerFee,
            takerFee: specialFee.takerFee
        });
    }

    /// increases the version of perpetual object
    entry fun increment_perpetual_version(_: &ExchangeAdminCap, perp: &mut PerpetualV2){
        perp.version = perp.version + 1;
    }

    /// allows guardian to remove UserPosition objects that have zero sized positions
    entry fun remove_empty_positions(safe: &CapabilitiesSafeV2, guardian: &ExchangeGuardianCap, clock: &Clock, perp: &mut PerpetualV2, pos_keys: vector<address>){

        roles::validate_safe_version(safe);

        assert!(perp.version == roles::get_version(), error::object_version_mismatch());

        roles::check_guardian_validity_v2(safe, guardian);

        let current_time = clock::timestamp_ms(clock);

        position::remove_empty_positions(positions(perp), pos_keys, current_time);
    }

    /// allows admin of the exchange to update maker fee of the provided perpetual
    /// fee is expected to be in 1e18 format 
    entry fun set_maker_fee(_: &ExchangeAdminCap, perp: &mut PerpetualV2, fee: u128){

        assert!(perp.version == roles::get_version(), error::object_version_mismatch());
        perp.makerFee = fee / library::base_uint();
        emit(
            MakerFeeUpdateEvent{
                perp: object::uid_to_inner(id_v2(perp)),
                makerFee: perp.makerFee
        });
    }


    /// allows admin of the exchange to update taker fee of the provided perpetual
    /// fee is expected to be in 1e18 format 
    entry fun set_taker_fee(_: &ExchangeAdminCap, perp: &mut PerpetualV2, fee: u128){

        assert!(perp.version == roles::get_version(), error::object_version_mismatch());
        perp.takerFee = fee / library::base_uint();
        emit(
            TakerFeeUpdateEvent{
                perp: object::uid_to_inner(id_v2(perp)),
                takerFee: perp.takerFee
        });
    }


    //===========================================================//
    //                         ORACLE PRICE                      //
    //===========================================================//

    public (friend) fun update_oracle_price(perp: &mut PerpetualV2, price_oracle: &PythFeeder){

        // verify that the incoming oracle object belongs to the provided perpetual        
        assert!(
            library::get_price_identifier(price_oracle) == perp.priceIdentifierId, 
            error::wrong_price_identifier());
        
        // update oracle price on the perp
        let oraclePrice = library::get_oracle_price(price_oracle);
        let expo = (pow(10,(library::get_oracle_base(price_oracle) as u8)) as u128);
        perp.priceOracle = library::base_div(oraclePrice, expo);

    }


    //===========================================================//
    //              MIGRATION of V1 Perpetual to V2              //
    //===========================================================//

    entry fun migrate_perpetual<T>(_: &ExchangeAdminCap, bank: &mut Bank<T>, perp: &mut Perpetual, pos_keys: vector<address>, fee_keys: vector<address>, ctx: &mut TxContext) {
        
        let id = object::new(ctx);
        let perpID =  object::uid_to_inner(&id);

        let perp_v2 = PerpetualV2 {
            id,
            version: roles::get_version(),
            name: perp.name,
            imr: perp.imr,
            mmr: perp.mmr,
            makerFee: perp.makerFee,
            takerFee: perp.takerFee,
            insurancePoolRatio: perp.insurancePoolRatio,
            insurancePool: perp.insurancePool,
            feePool: perp.feePool,
            delisted: perp.delisted,
            delistingPrice: perp.delistingPrice,
            isTradingPermitted: true,
            startTime: perp.startTime,
            checks: perp.checks,
            positions: table::new<address, UserPosition>(ctx),
            specialFee: table::new<address, SpecialFee>(ctx),
            priceOracle: perp.priceOracle,
            funding: perp.funding,
            priceIdentifierId: perp.priceIdentifierId,
        };

        {
            // copy all positions data from old perp to new perp 
            let count = vector::length(&pos_keys);
            let i = 0;
            while (i < count){
                let addr = *vector::borrow(&pos_keys, i);
                let position = *table::borrow(&perp.positions, addr);
                table::add(&mut perp_v2.positions, addr, position);
                i = i+1;
            };
        };

        {
            // copy all special fee data from old perp to new perp 
            let count = vector::length(&fee_keys);
            let i = 0;
            while (i < count){
                let addr = *vector::borrow(&fee_keys, i);
                let special_fee = *table::borrow(&perp.specialFee, addr);
                table::add(&mut perp_v2.specialFee, addr, special_fee);
                i = i+1;
            };

        };
       
        // create bank account for our new perpetual
        margin_bank::initialize_account(
            margin_bank::mut_accounts(bank), 
            object::id_to_address(&perpID),
        );
        
        // move all money from old perpetual address to new perp;
        // get balance of perp in V1 bank
        let total_perp_balance = margin_bank::get_balance(
            bank, 
            object::id_to_address(&object::uid_to_inner(&perp.id))
        );

        // using v1 transfer_margin_to_account as Bank is V1
        margin_bank::transfer_margin_to_account(
            bank,
            object::id_to_address(&object::uid_to_inner(&perp.id)),
            object::id_to_address(&perpID),
            total_perp_balance,
            2,
        );

        // share the object
        transfer::share_object(perp_v2);

        // de-list the old perpetual
        perp.delisted = true;
        perp.delistingPrice = 0;
    } 

}