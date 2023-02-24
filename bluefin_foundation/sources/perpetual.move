
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
        checks:TradeChecks,
        initialMarginRequired: u128,
        maintenanceMarginRequired: u128,
        makerFee: u128,
        takerFee: u128,
    }

    //===========================================================//
    //                           STORAGE                         //
    //===========================================================//

    struct Perpetual has key, store {
        id: UID,
        /// name of perpetual
        name: String,
        /// Trade Checks
        checks: TradeChecks,
        /// imr: the initial margin collateralization percentage
        initialMarginRequired: u128,
        /// mmr: the minimum collateralization percentage
        maintenanceMarginRequired: u128,
        /// Default maker order fee for this Perpetual
        makerFee: u128,
        /// Default taker order fee for this Perpetual
        takerFee: u128,
        /// table containing user positions for this market/perpetual
        positions: Table<address,UserPosition>,
        /// Price Oracle
        priceOracle: PriceOracle
    }

    //===========================================================//
    //                      INITIALIZATION                       //
    //===========================================================//

    public fun initialize(
        id: UID,
        name:vector<u8>, 
        checks: TradeChecks,
        initialMarginRequired: u128,
        maintenanceMarginRequired: u128,
        makerFee: u128,
        takerFee: u128,
        positions: Table<address,UserPosition>,
        priceOracle: PriceOracle
        ){
        
        let perpID = object::uid_to_inner(&id);

        let perp = Perpetual {
            id,
            name: string::utf8(name),
            checks,
            initialMarginRequired,
            maintenanceMarginRequired,
            makerFee,
            takerFee,
            positions,
            priceOracle
        };

        emit(PerpetualCreationEvent {
            id: perpID,
            name: perp.name,
            checks,
            initialMarginRequired,
            maintenanceMarginRequired,
            makerFee,
            takerFee    
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
        return perp.initialMarginRequired
    }

    public fun mmr(perp:&Perpetual):u128{
        return perp.maintenanceMarginRequired
    }

    public fun makerFee(perp:&Perpetual):u128{
        return perp.makerFee
    }

    public fun takerFee(perp:&Perpetual):u128{
        return perp.takerFee
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