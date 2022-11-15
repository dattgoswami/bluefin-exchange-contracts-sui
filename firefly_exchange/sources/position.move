module firefly_exchange::position {
    use sui::object::{ID};
    use sui::event;

    struct UserPosition has copy, drop, store {
        isPosPositive:bool,
        qPos: u128, 
        margin: u128, 
        oiOpen: u128,
        mro: u128,
    }

    struct AccountPositionUpdateEvent has copy, drop {
        perpetual:ID,
        user:address,
        position:UserPosition
    }


    public fun initPosition(perpetual:ID, user:address): UserPosition{
        let position = UserPosition {
            isPosPositive: false,
            qPos: 0,
            margin: 0,
            oiOpen: 0,
            mro: 0,
        };

        event::emit(AccountPositionUpdateEvent {
            perpetual,
            user,
            position
        });

        return position
    }

    public fun updatePosition(perpetual:ID, position: &mut UserPosition, user:address, isPosPositive: bool, qPos: u128, margin: u128, oiOpen: u128, mro: u128){
        position.isPosPositive = isPosPositive;
        position.qPos = qPos;
        position.margin = margin;
        position.oiOpen = oiOpen;
        position.mro = mro;

        event::emit(AccountPositionUpdateEvent {
            perpetual,
            user,
            position:*position
        });
    }

}