module pyth::pyth {
 //   use sui::transfer;

    //use std::vector;
   // use sui::tx_context::{TxContext};
    //use sui::coin::{Self, Coin};
    //use sui::sui::{SUI};
    //use sui::transfer::{Self};
    //use sui::clock::{Self, Clock};
    //use sui::package::{UpgradeCap};

    
   
    use pyth::price_info::{Self, PriceInfo, PriceInfoObject}; 
    use pyth::price_feed::{Self};
    use pyth::price::{Self, Price};
    //use pyth::price_identifier::{PriceIdentifier};


    public entry fun create_price(): PriceInfo{
        let value = price_info::new_price_info(
                    1663680747,
                    1663074349,
                    price_feed::new(
                        pyth::price_identifier::from_byte_vec(x"c6c75c89f14810ec1c54c03ab8f1864a4c4032791f05747f560faec380a695d1"),
                        price::new(pyth::i64::new(1557, false), 7, pyth::i64::new(6, true), 1663680740),
                        price::new(pyth::i64::new(1500, false), 3, pyth::i64::new(6, true), 1663680740),
                    ) );
       // let obj = price_info::new_price_info_object(value,ctx);
        //return obj;
        return value
    }


   
    /// WARNING: the returned price can be from arbitrarily far in the past.
    /// This function makes no guarantees that the returned price is recent or
    /// useful for any particular application. Users of this function should check
    /// the returned timestamp to ensure that the returned price is sufficiently
    /// recent for their application. The checked get_price_no_older_than()
    /// function should be used in preference to this.
    public entry fun get_price_unsafe(price_info_object: &PriceInfoObject): Price {
        // TODO: extract Price from this guy...
        let price_info = price_info::get_price_info_from_price_info_object(price_info_object);
        price_feed::get_price(
            price_info::get_price_feed(&price_info)
        )
    }
}