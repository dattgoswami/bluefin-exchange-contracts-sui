module bluefin_foundation::margin_math {

    use bluefin_foundation::position::{Self, UserPosition};
    use bluefin_foundation::library::{Self};
    use bluefin_foundation::signed_number::{Self};

    /**
     * @dev returns margin left in an account's position at the time of position closure
     * post perpetual delisting
     * @param userPos account's position on perpetual
     * @param price price of oracle for delisting
     * @param balance amount of balance, USDC perpetual has
     */
    public fun get_margin_left(userPos: UserPosition, price: u128, balance: u128) : u128 {

        let marginLeft;
        let pPos = position::compute_average_entry_price(userPos);
        let margin = position::margin(userPos);
        let oiOpen = position::oiOpen(userPos);

        if (position::isPosPositive(userPos)) {
            marginLeft = library::sub(margin + (( oiOpen *  price) /  pPos), oiOpen);
        } else {
            marginLeft = library::sub(margin + oiOpen, (oiOpen *  price) /  pPos);
        };

        // // if not enough balance in perpetual, margin left is equal to total
        // // amount left in perpetual
        return library::min(marginLeft, balance)
    }


    /**
     * @dev returns the target margin required when adjusting leverage
     * @param userPos account's position on perpetual
     * @param leverage new leverage
     * @param price oracle price of the asset
     */
    public fun get_target_margin(userPos: UserPosition, leverage: u128, price: u128): u128{
        let targetMargin;
        let oiOpen = position::oiOpen(userPos);
        let qPos = position::qPos(userPos);

        let notionalValue = library::base_mul(qPos, price);
        let userMargin = library::base_div(notionalValue, leverage);

        if (position::isPosPositive(userPos)) {
            // if long
            targetMargin = library::sub(userMargin +  oiOpen, notionalValue);
        } else {
            // if short
            targetMargin = library::sub(userMargin +  notionalValue, oiOpen);
        }; 

        return targetMargin
    }

    /**
     * @dev returns the maximum removeable amount of margin from an accounts position
     * before the account becomes under collat
     * @param userPos account's position on perpetual
     * @param price oracle price of the asset
     */
    public fun get_max_removeable_margin(userPos: UserPosition, price: u128): u128{
        let maxRemovableAmount;
        let mro = position::mro(userPos);
        let margin = position::margin(userPos);
        let oiOpen = position::oiOpen(userPos);
        let qPos = position::qPos(userPos);

        let notionalValue = library::base_mul(qPos, price);

        if (position::isPosPositive(userPos)) {
            // if long
            let mr = library::base_uint() -  mro;
            let userMargin = library::base_mul(notionalValue, mr);
            
            maxRemovableAmount = library::min(
                margin, 
                signed_number::positive_value(
                    signed_number::add_uint(
                        signed_number::from_subtraction(margin, oiOpen), 
                        userMargin) 
                    )
                );

        } else {
            // if short
            let mr = library::base_uint() + mro;
            let userMargin = library::base_mul(notionalValue, mr); 
            maxRemovableAmount = library::min(
                margin,            
                library::sub(
                    margin + oiOpen,  
                    userMargin)
                );
            };

        return maxRemovableAmount
    }   
}