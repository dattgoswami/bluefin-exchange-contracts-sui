module bluefin_exchange::position {
    use sui::object::{ID};
    use bluefin_exchange::library::{Self};
    use bluefin_exchange::signed_number::{Self, Number};

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

    public fun user(position:UserPosition): address {
        return position.user
    }

    public fun margin_ratio(position:UserPosition, price:u128): Number {
        let marginRatio = signed_number::one();

        // when user has no position margin ratio is 1
        if(position.qPos == 0){
            return marginRatio
        };

        let balance = library::base_mul(price, position.qPos);

        if(position.isPosPositive){
            // Assuming oiOpen is never < margin
            let debt = position.oiOpen - position.margin;
            let debtRatio = library::base_div(debt, balance);
            marginRatio = signed_number::from_subtraction(
                library::base_uint(), 
                debtRatio);

        } else {
            let debt = position.oiOpen + position.margin;
            let debtRatio = library::base_div(debt, balance);
            marginRatio = signed_number::from_subtraction(
                debtRatio, 
                library::base_uint());
        };  
        return marginRatio
    }

    public fun average_entry_price(position:UserPosition): u128 {
        return if (position.oiOpen == 0) { 0 } else { 
            library::base_div(position.oiOpen, position.qPos) 
            }
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