

module firefly_exchange::perpetual {

    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use std::string::{Self, String};
    use sui::transfer;

    struct AdminCap has key {
        id: UID,
    }
    
    // name of the perpetual
    struct PerpName has key, store {
        id: UID,
        name: String
    }

    fun init(ctx: &mut TxContext) {        
        // giving deployer the admin cap
        let admin = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(admin, tx_context::sender(ctx));
    }

    // only admin can invoke this
    public fun setPerpetualName(_: &AdminCap, name: vector<u8>, ctx: &mut TxContext){
        let perpName = PerpName {
            id: object::new(ctx),
            name: string::utf8(name)
        };
        transfer::freeze_object(perpName);
    }

}