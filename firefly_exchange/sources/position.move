module firefly_exchange::position {
    use sui::object::{ID};

    struct UserPosition has copy, drop, store {
        user:address,
        perpID: ID,
        isPosPositive:bool,
        qPos: u128, 
        margin: u128, 
        oiOpen: u128,
        mro: u128,
    }

    public fun initPosition(perpID: ID, user:address): UserPosition{
        return UserPosition {
            user,
            perpID,
            isPosPositive: false,
            qPos: 0,
            margin: 0,
            oiOpen: 0,
            mro: 0,
        }
    }

    public fun isPosPositive(position:UserPosition): bool {
        return position.isPosPositive
    }

    public fun qPos(position:UserPosition): u128 {
        return position.qPos
    }

    public fun margin(position:UserPosition): u128 {
        return position.margin
    }
    
    public fun oiOpen(position:UserPosition): u128 {
        return position.oiOpen
    }
    public fun mro(position:UserPosition): u128 {
        return position.mro
    }

    public fun set_mro(position:&mut UserPosition, mro:u128) {
        position.mro = mro;
    }

    public fun set_oiOpen(position:&mut UserPosition, oiOpen:u128) {
        position.oiOpen = oiOpen;
    }

    public fun set_margin(position:&mut UserPosition, margin:u128) {
        position.margin = margin;
    }


    public fun set_qPos(position:&mut UserPosition, qPos:u128) {
        position.qPos = qPos;
    }


    public fun set_isPosPositive(position:&mut UserPosition, isPosPositive:bool) {
        position.isPosPositive = isPosPositive;
    }



}