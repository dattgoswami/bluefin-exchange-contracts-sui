
module bluefin_foundation::perpetual {

    use sui::object::{Self, ID, UID};
    use std::string::{Self, String};
    use sui::table::{Table};
    use sui::event::{emit};
    use sui::transfer;

    // custom modules
    use bluefin_foundation::position::{UserPosition};
    use bluefin_foundation::price_oracle::{PriceOracle};
    use bluefin_foundation::evaluator::{Self, TradeChecks};
    use bluefin_foundation::roles::{ExchangeAdminCap};
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::library::{Self};

    //friend modules
    friend bluefin_foundation::exchange;
    friend bluefin_foundation::isolated_trading;
    friend bluefin_foundation::isolated_liquidation;
    friend bluefin_foundation::isolated_adl;
    
    //===========================================================//
    //                           EVENTS                         //
    //===========================================================//

    struct PerpetualCreationEvent has copy, drop {
        id: ID,
        name: String,
        imr: u128,
        mmr: u128,
        makerFee: u128,
        takerFee: u128,
        maxAllowedFR: u128,
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

    struct MaxAllowedFRUpdateEvent has copy, drop {
        id: ID,
        value: u128
    }

    struct PerpetualDelistEvent has copy, drop {
        id: ID,
        delistingPrice: u128
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
        /// max allowed funding rate
        maxAllowedFR: u128,
        /// percentage of liquidaiton premium goes to insurance pool
        insurancePoolRatio: u128, 
        /// address of insurance pool
        insurancePool: address,
        /// fee pool address
        feePool: address,
        /// trade checks
        checks: TradeChecks,
        /// table containing user positions for this market/perpetual
        positions: Table<address,UserPosition>,
        /// price oracle
        priceOracle: PriceOracle,
        /// delist status
        delisted: bool,
        /// the price at which trades will be executed after delisting
        delistingPrice: u128
    }

    //===========================================================//
    //                      FRIEND FUNCTIONS                     //
    //===========================================================//

    public (friend) fun initialize(
        id: UID,
        name:vector<u8>, 
        imr: u128,
        mmr: u128,
        makerFee: u128,
        takerFee: u128,
        maxAllowedFR: u128,
        insurancePoolRatio: u128,
        insurancePool: address,
        feePool: address,
        checks: TradeChecks,
        positions: Table<address,UserPosition>,
        priceOracle: PriceOracle
        ){
        
        let perpID = object::uid_to_inner(&id);

        let perp = Perpetual {
            id,
            name: string::utf8(name),
            imr,
            mmr,
            makerFee,
            takerFee,
            maxAllowedFR,
            insurancePoolRatio,
            insurancePool,
            feePool,
            checks,
            positions,
            priceOracle,
            delisted: false,
            delistingPrice: 0
        };

        emit(PerpetualCreationEvent {
            id: perpID,
            name: perp.name,
            imr,
            mmr,
            makerFee,
            takerFee,
            maxAllowedFR, 
            insurancePoolRatio,
            insurancePool,
            feePool,
            checks,  
        });
        
        transfer::share_object(perp);
    }

    public (friend) fun positions(perp:&mut Perpetual):&mut Table<address,UserPosition>{
        return &mut perp.positions
    }

    public (friend) fun mut_checks(perp:&mut Perpetual):&mut TradeChecks{
        return &mut perp.checks
    }

    public (friend) fun mut_priceOracle(perp:&mut Perpetual):&mut PriceOracle{
        return &mut perp.priceOracle
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

    public fun maxAllowedFR(perp:&Perpetual):u128{
        return perp.maxAllowedFR
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

    public entry fun set_max_allowed_funding_rate(_: &ExchangeAdminCap, perp: &mut Perpetual,  maxAllowedFR: u128){
        assert!(maxAllowedFR <= library::base_uint(), error::can_not_be_greater_than_hundred_percent());
        let perpID = object::uid_to_inner(id(perp));
        perp.maxAllowedFR = maxAllowedFR;
        
        emit(MaxAllowedFRUpdateEvent {
            id: perpID,
            value: maxAllowedFR
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


}