module bluefin_foundation::position {
    use sui::object::{ID};
    use sui::table::{Self, Table};
    use sui::event::{emit};

    // custom modules
    use bluefin_foundation::library::{Self};
    use bluefin_foundation::signed_number::{Self, Number};
    use bluefin_foundation::error::{Self};

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct AccountPositionUpdateEvent has copy, drop {
        perpID: ID,
        account:address,
        position:UserPosition,
        action: u8
    }

    //===========================================================//
    //                           STORAGE                         //
    //===========================================================//

    struct UserPosition has copy, drop, store {
        user:address,
        perpID: ID,
        isPosPositive:bool,
        qPos: u128, 
        margin: u128, 
        oiOpen: u128,
        mro: u128,
    }

    //===========================================================//
    //                      INITIALIZATION                       //
    //===========================================================//
    
    public fun initialize(perpID: ID, user:address): UserPosition{
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

    //===========================================================//
    //                          ACCESSORS                        //
    //===========================================================//

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

    //===========================================================//
    //                          SETTERS                          //
    //===========================================================//

    public fun set_mro(position:&mut UserPosition, mro:u128) {
        //  if position is closed due to reducing trade reset mro to zero
        if(position.qPos == 0){
            position.mro = 0;
        } else {
            position.mro = mro;
        }
    }

    public fun set_oiOpen(position:&mut UserPosition, oiOpen:u128) {
        position.oiOpen = oiOpen;
    }

    public fun set_margin(position:&mut UserPosition, margin:u128) {
        position.margin = margin;
    }


    public fun set_qPos(position:&mut UserPosition, qPos:u128) {
        position.qPos = qPos;

        if(qPos == 0){
            // if new position size is zero we are setting isPosPositive to false
            // this is what default value for isPosPositive is
            set_isPosPositive(position, false);
            // reset mro to 0
            set_mro(position, 0);
        };

    }

    public fun set_isPosPositive(position:&mut UserPosition, isPosPositive:bool) {
        position.isPosPositive = isPosPositive;
    }

    //===========================================================//
    //                           HELPERS                         //
    //===========================================================//

    public fun compute_margin_ratio(position:UserPosition, price:u128): Number {
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

    public fun compute_average_entry_price(position:UserPosition): u128 {
        return if (position.oiOpen == 0) { 0 } else { 
            library::base_div(position.oiOpen, position.qPos) 
            }
    }

    public fun create_position(perpID:ID, positions: &mut Table<address, UserPosition>, addr: address){
        
        if(!table::contains(positions, addr)){
            table::add(positions, addr, initialize(perpID, addr));
        };

    }   

    public fun emit_position_update_event(perpID:ID, account:address, position: UserPosition, action:u8){
        emit (AccountPositionUpdateEvent{
            perpID, 
            account,
            position,
            action
        });
    }

    public fun verify_collat_checks(initialPosition: UserPosition, currentPosition: UserPosition, imr: u128, mmr: u128, price:u128, tradeType: u8, isTaker:u64){

            let initMarginRatio = compute_margin_ratio(initialPosition, price);
            let currentMarginRatio = compute_margin_ratio(currentPosition, price);

            // Case 0: Current Margin Ratio >= IMR: User can increase and reduce positions.
            if (signed_number::gte_uint(currentMarginRatio, imr)) {
                return
            };

            // Case I: For MR < IMR: If flipping or new trade, current ratio can only be >= IMR
            assert!(
                currentPosition.isPosPositive == initialPosition.isPosPositive
                && 
                initialPosition.qPos > 0,
                error::mr_less_than_imr_can_not_open_or_flip_position(isTaker)
            );

            // Case II: For MR < IMR: require MR to have improved or stayed the same
            assert!(
                signed_number::gte(currentMarginRatio, initMarginRatio), 
                error::mr_less_than_imr_mr_must_improve(isTaker)
                );

            // Case III: For MR <= MMR require qPos to go down or stay the same
            assert!(
                signed_number::gte_uint(currentMarginRatio, mmr)
                ||
                (
                    initialPosition.qPos >= currentPosition.qPos
                    &&
                    initialPosition.isPosPositive == currentPosition.isPosPositive
                ),
                error::mr_less_than_imr_position_can_only_reduce(isTaker)
            );

            // Case IV: For MR < 0 require that its a liquidation
            // @dev A normal trade type is 1
            // @dev A liquidation trade type is 2
            // @dev A deleveraging trade type is 3
            assert!(
                signed_number::gte_uint(currentMarginRatio, 0)
                || 
                tradeType == 2 || tradeType == 3,
                error::mr_less_than_zero(isTaker)
                );
    }

    public fun compute_mro(leverage:u128): u128 {
        return library::base_div(library::base_uint(), leverage)
    }

    public fun compute_pnl_per_unit(position: UserPosition, price: u128): Number{
        let pPos = compute_average_entry_price(position);

        return if (position.isPosPositive) { 
                signed_number::from_subtraction(price, pPos) 
                } else { 
                signed_number::from_subtraction(pPos, price) 
                }
    }

    /**
     * @dev returns true if account is undercollateralized
     */
    public fun is_undercollat(position:UserPosition, oraclePrice:u128, mmr: u128): bool {
            return signed_number::lt_uint(
                compute_margin_ratio(position, oraclePrice),
                mmr)
    }
}