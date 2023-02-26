
module bluefin_foundation::perpetual {

    use sui::object::{Self, ID, UID};
    use std::string::{Self, String};
    use sui::table::{Table};
    use sui::event::{emit};
    use sui::transfer;

    // custom modules
    use bluefin_foundation::position::{UserPosition};
    use bluefin_foundation::price_oracle::{PriceOracle};
    use bluefin_foundation::evaluator::{TradeChecks};

    
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
        priceOracle: PriceOracle
    }

    //===========================================================//
    //                      INITIALIZATION                       //
    //===========================================================//

    public fun initialize(
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
            priceOracle
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

    public fun positions(perp:&mut Perpetual):&mut Table<address,UserPosition>{
        return &mut perp.positions
    }

    public fun mut_checks(perp:&mut Perpetual):&mut TradeChecks{
        return &mut perp.checks
    }

    public fun mut_priceOracle(perp:&mut Perpetual):&mut PriceOracle{
        return &mut perp.priceOracle
    }

}