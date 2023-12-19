module bluefin_foundation::position {
    use sui::object::{ID};
    use sui::table::{Self, Table};
    use sui::event::{emit};
    use std::vector;

    // custom modules
    use bluefin_foundation::signed_number::{Self, Number};
    use bluefin_foundation::funding_rate::{Self, FundingIndex};
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::library::{Self};


    // friend modules
    friend bluefin_foundation::exchange;
    friend bluefin_foundation::perpetual;
    friend bluefin_foundation::isolated_liquidation;
    friend bluefin_foundation::isolated_trading;
    friend bluefin_foundation::isolated_adl;

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct AccountPositionUpdateEvent has copy, drop {
        position:UserPosition,
        sender: address,
        action: u8
    }

    struct PositionClosedEvent has copy, drop{
        perpID: ID,
        account: address,
        amount: u128,
    }


    struct AccountPositionUpdateEventV2 has copy, drop {
        tx_index: u128,
        position:UserPosition,
        sender: address,
        action: u8
    }

    struct PositionClosedEventV2 has copy, drop{
        tx_index: u128,
        perpID: ID,
        account: address,
        amount: u128,
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
        index: FundingIndex
    }

    //===========================================================//
    //                      INITIALIZATION                       //
    //===========================================================//
    
    public (friend) fun initialize(perpID: ID, user:address): UserPosition{
        return UserPosition {
            user,
            perpID,
            isPosPositive: false,
            qPos: 0,
            margin: 0,
            oiOpen: 0,
            mro: 0,
            index: funding_rate::initialize_index(0)
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

    public fun index(position:UserPosition): FundingIndex {
        return position.index
    }

    //===========================================================//
    //                          SETTERS                          //
    //===========================================================//

    public (friend) fun set_mro(position:&mut UserPosition, mro:u128) {
        //  if position is closed due to reducing trade reset mro to zero
        if(position.qPos == 0){
            position.mro = 0;
        } else {
            position.mro = mro;
        }
    }

    public (friend) fun set_oiOpen(position:&mut UserPosition, oiOpen:u128) {
        position.oiOpen = oiOpen;
    }

    public (friend) fun set_margin(position:&mut UserPosition, margin:u128) {
        position.margin = margin;
    }


    public (friend) fun set_qPos(position:&mut UserPosition, qPos:u128) {
        position.qPos = qPos;

        if(qPos == 0){
            // if new position size is zero we are setting isPosPositive to false
            // this is what default value for isPosPositive is
            set_isPosPositive(position, false);
            // reset mro to 0
            set_mro(position, 0);
        };

    }

    public (friend) fun set_isPosPositive(position:&mut UserPosition, isPosPositive:bool) {
        position.isPosPositive = isPosPositive;
    }

    public (friend) fun set_index(position:&mut UserPosition, index:FundingIndex) {
        position.index = index;
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
            let debt = signed_number::from_subtraction(
                position.oiOpen, 
                position.margin
                );

            if(balance > 0){
                let debtRatio = signed_number::div_uint(debt, balance);
                marginRatio = signed_number::sub(marginRatio, debtRatio);
            } 

        } else {
            let debt = position.oiOpen + position.margin;

            if(balance > 0){
                let debtRatio = library::base_div(debt, balance);
                marginRatio = signed_number::from_subtraction(
                    debtRatio, 
                    library::base_uint());
            } 
        };  
        
        return marginRatio
    }

    public fun compute_average_entry_price(position:UserPosition): u128 {
        return if (position.qPos == 0) { 0 } else { 
            library::base_div(position.oiOpen, position.qPos) 
            }
    }

    public (friend) fun create_position(perpID:ID, positions: &mut Table<address, UserPosition>, addr: address){
        
        if(!table::contains(positions, addr)){
            table::add(positions, addr, initialize(perpID, addr));
        };

    }   

    // removes empty user positions from provided positions table
    public (friend) fun remove_empty_positions(positions: &mut Table<address, UserPosition>, pos_keys: vector<address>, current_time: u64) {

        let count = vector::length(&pos_keys);
        let i = 0;
        // iterate over all provided user addresses
        while (i < count){
            let addr = *vector::borrow(&pos_keys, i);
            i=i+1;
            // if user exists 
            if(table::contains(positions, addr)){
                // get user position
                let position = table::borrow(positions, addr);

                // if position size is zero and no funding rate has been applied to user in last 7 days
                // then remove user position from table.
                // 1 day == 86400000 ms
                // 7 days == 604800000 ms           
                if(position.qPos == 0 && current_time - funding_rate::index_timestamp(position.index) > 604800000) {
                    table::remove(positions, addr);
                }
            }
        }
    }   

    public (friend) fun emit_position_update_event(position: UserPosition, sender:address, action:u8, tx_index:u128){
        emit (AccountPositionUpdateEventV2{
            tx_index,
            position,
            sender,
            action
        });
    }

    public (friend) fun emit_position_closed_event(perpID:ID, account:address, amount: u128, tx_index: u128){
        emit(PositionClosedEventV2{tx_index, perpID, account, amount});
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
                signed_number::gt_uint(currentMarginRatio, mmr)
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