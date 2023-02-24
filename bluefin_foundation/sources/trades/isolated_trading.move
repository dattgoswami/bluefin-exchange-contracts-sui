module bluefin_foundation::isolated_trading {

    use std::vector;
    use std::hash;
    use sui::bcs;
    use sui::event::{emit};
    use sui::object::{Self, ID};
    use sui::table::{Self, Table};
    use sui::ecdsa_k1;

    use bluefin_foundation::perpetual::{Self, Perpetual};
    use bluefin_foundation::position::{Self, UserPosition};
    use bluefin_foundation::price_oracle::{Self};
    use bluefin_foundation::evaluator::{Self, TradeChecks};
    use bluefin_foundation::signed_number::{Self, Number};
    use bluefin_foundation::library::{Self};
    use bluefin_foundation::error::{Self};

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct OrderFill has copy, drop {
        orderHash:vector<u8>,
        order: Order,
        fill: u128,
        filledQuantity: u128        
    }

    struct TradeExecuted has copy, drop {
        sender:address,
        perpID: ID,
        tradeType: u64,
        maker: address,
        taker: address,
        makerOrderHash: vector<u8>,
        takerOrderHash: vector<u8>,
        makerMRO: u128,
        takerMRO: u128,
        makerFee: u128,
        takerFee: u128,
        makerPnl: Number,
        takerPnl: Number,
        tradeQuantity: u128,
        tradePrice: u128,
        isBuy: bool
    }


    //===========================================================//
    //                           STORAGE                         //
    //===========================================================//

    struct Order has drop, copy {
        isBuy: bool,
        price: u128,
        quantity: u128,
        leverage: u128,
        reduceOnly: bool,
        makerAddress: address,
        expiration: u128,
        salt: u128,
        triggerPrice: u128,
        signature: vector<u8>
    }

    struct OrderStatus has store, drop {
        status: bool,
        filledQty: u128
    }


    struct TradeData has drop, copy {
        makerOrder: Order,
        takerOrder: Order,
        fill:Fill
    }

    struct Fill has drop, copy {
        quantity: u128,
        price: u128
    }

    struct IMResponse has store, drop {
        fundsFlow: Number,
        pnlPerUnit: Number,
        feePerUnit: u128
    }


    //===========================================================//
    //                      TRADE METHOD
    //===========================================================//

    public fun trade(sender: address, perp: &mut Perpetual, ordersTable: &mut Table<vector<u8>, OrderStatus>, data: TradeData){

            assert!(data.makerOrder.isBuy != data.takerOrder.isBuy, error::order_cannot_be_of_same_side());

            let oraclePrice = price_oracle::price(perpetual::priceOracle(perp));
            let makerFee = perpetual::makerFee(perp);
            let takerFee = perpetual::takerFee(perp);
            let perpID = object::uid_to_inner(perpetual::id(perp));

            // // if maker/taker positions don't exist create them
            position::create_position(perpID, perpetual::positions(perp), data.makerOrder.makerAddress);
            position::create_position(perpID, perpetual::positions(perp), data.takerOrder.makerAddress);

            // TODO check if trading is allowed by guardian for given perpetual or not

            // TODO check if trading is started or not

            // TODO apply funding rate

            // // get order hashes
            let makerHash = get_hash(data.makerOrder, perpID);
            let takerHash = get_hash(data.takerOrder, perpID);

            // if maker/taker orders are coming on-chain for first time, add them to order table
            create_order(ordersTable, makerHash);
            create_order(ordersTable, takerHash);

            // if taker order is market order
            if(data.takerOrder.price == 0){
                data.takerOrder.price = data.fill.price;    
            };

            // update orders to have non decimal based leverage
            data.makerOrder.leverage = library::round_down(data.makerOrder.leverage);
            data.takerOrder.leverage = library::round_down(data.takerOrder.leverage);

            // Validate orders are correct and can be executed for the trade
            verify_order(perp, ordersTable, data.makerOrder, makerHash, data.fill, 0);
            verify_order(perp, ordersTable, data.takerOrder, takerHash, data.fill, 1);

            // verify pre-trade checks
            evaluator::verify_price_checks(perpetual::checks(perp), data.fill.price);
            evaluator::verify_qty_checks(perpetual::checks(perp), data.fill.quantity);
            evaluator::verify_market_take_bound_checks(perpetual::checks(perp), data.fill.price, oraclePrice, data.takerOrder.isBuy);

            let initMakerPosition = *table::borrow(perpetual::positions(perp), data.makerOrder.makerAddress);
            let initTakerPosition = *table::borrow(perpetual::positions(perp), data.takerOrder.makerAddress);

            // apply isolated margin
            let makerResponse = apply_isolated_margin(
                perpetual::checks(perp),
                table::borrow_mut(perpetual::positions(perp), data.makerOrder.makerAddress), 
                data.makerOrder, 
                data.fill, 
                library::base_mul(data.fill.price, makerFee),
                0);

            let takerResponse = apply_isolated_margin(
                perpetual::checks(perp),
                table::borrow_mut(perpetual::positions(perp), data.takerOrder.makerAddress), 
                data.takerOrder, 
                data.fill, 
                library::base_mul(data.fill.price, takerFee),
                1);


            let newMakerPosition = *table::borrow(perpetual::positions(perp), data.makerOrder.makerAddress);
            let newTakerPosition = *table::borrow(perpetual::positions(perp), data.takerOrder.makerAddress);
                                   
            // verify collateralization of maker and take
            position::verify_collat_checks(
                initMakerPosition, 
                newMakerPosition, 
                perpetual::imr(perp), 
                perpetual::mmr(perp), 
                oraclePrice, 
                1, 
                0);

            position::verify_collat_checks(
                initTakerPosition, 
                newTakerPosition, 
                perpetual::imr(perp), 
                perpetual::mmr(perp), 
                oraclePrice, 
                1, 
                1);

            position::emit_position_update_event(perpID, data.makerOrder.makerAddress, newMakerPosition, 0);
            position::emit_position_update_event(perpID, data.takerOrder.makerAddress, newTakerPosition, 0);

    
            emit(TradeExecuted{
                sender,
                perpID,
                tradeType: 1,
                maker: data.makerOrder.makerAddress,
                taker: data.takerOrder.makerAddress,
                makerOrderHash: makerHash,
                takerOrderHash: takerHash,
                makerMRO: position::mro(newMakerPosition),
                takerMRO: position::mro(newTakerPosition),
                makerFee: library::base_mul(makerResponse.feePerUnit, data.fill.quantity),
                takerFee: library::base_mul(takerResponse.feePerUnit, data.fill.quantity),
                makerPnl: makerResponse.pnlPerUnit,
                takerPnl: takerResponse.pnlPerUnit,
                tradeQuantity: data.fill.quantity,
                tradePrice: data.fill.price,
                isBuy: data.takerOrder.isBuy,
            });
    }

    //===========================================================//
    //                      HELPER METHODS
    //===========================================================//

    public fun pack_trade_data(
         // maker
        makerTriggerPrice: u128,
        makerIsBuy: bool,
        makerPrice: u128,
        makerQuantity: u128,
        makerLeverage: u128,
        makerReduceOnly: bool,
        makerAddress: address,
        makerExpiration: u128,
        makerSalt: u128,
        makerSignature:vector<u8>,

        // taker
        takerTriggerPrice: u128,
        takerIsBuy: bool,
        takerPrice: u128,
        takerQuantity: u128,
        takerLeverage: u128,
        takerReduceOnly: bool,
        takerAddress: address,
        takerExpiration: u128,
        takerSalt: u128,
        takerSignature:vector<u8>,

        // fill
        quantity: u128, 
        price: u128,
    ): TradeData{
        let makerOrder = pack_order(makerTriggerPrice, makerIsBuy, makerPrice, makerQuantity, makerLeverage, makerReduceOnly, makerAddress, makerExpiration, makerSalt, makerSignature);
        let takerOrder = pack_order(takerTriggerPrice, takerIsBuy, takerPrice, takerQuantity, takerLeverage, takerReduceOnly, takerAddress, takerExpiration, takerSalt, takerSignature);
        let fill = Fill{quantity, price};
        return TradeData{makerOrder, takerOrder, fill}

    }

    fun pack_order(
        triggerPrice: u128,
        isBuy: bool,
        price: u128,
        quantity: u128,
        leverage: u128,
        reduceOnly: bool,
        makerAddress: address,
        expiration: u128,
        salt: u128,
        signature: vector<u8>
    ): Order {
        return Order {
                triggerPrice,
                isBuy,
                price,
                quantity,
                leverage,
                reduceOnly,
                makerAddress,
                expiration,
                salt,
                signature,
        }
    }

    fun get_hash(order:Order, _perpID: ID): vector<u8>{
        /*
        serializedOrder
         [0,15]     => price            (128 bits = 16 bytes)
         [16,31]    => quantity         (128 bits = 16 bytes)
         [32,47]    => leverage         (128 bits = 16 bytes)
         [48,63]    => expiration       (128 bits = 16 bytes)
         [64,79]    => salt             (128 bits = 16 bytes)
         [80,95]    => triggerPrice     (128 bits = 16 bytes)
         [96,115]   => data.makerOrder.makerAddress     (160 bits = 20 bytes)
         [116,116]  => reduceOnly       (1 byte)
         [117,117]  => isBuy            (1 byte)
        */

        let serialized_order = vector::empty<u8>();
        let price_b = bcs::to_bytes(&order.price);
        let quantity_b = bcs::to_bytes(&order.quantity);
        let leverage_b = bcs::to_bytes(&order.leverage);
        let maker_address_b = bcs::to_bytes(&order.makerAddress); // doesn't need reverse
        let expiration_b = bcs::to_bytes(&order.expiration);
        let salt_b = bcs::to_bytes(&order.salt);
        let trigger_price_b = bcs::to_bytes(&order.triggerPrice);
        let reduce_only_b = bcs::to_bytes(&order.reduceOnly);
        let is_buy_b = bcs::to_bytes(&order.isBuy);


        vector::reverse(&mut price_b);
        vector::reverse(&mut quantity_b);
        vector::reverse(&mut leverage_b);
        vector::reverse(&mut expiration_b);
        vector::reverse(&mut salt_b);
        vector::reverse(&mut trigger_price_b);

        vector::append(&mut serialized_order, price_b);
        vector::append(&mut serialized_order, quantity_b);
        vector::append(&mut serialized_order, leverage_b);
        vector::append(&mut serialized_order, expiration_b);
        vector::append(&mut serialized_order, salt_b);
        vector::append(&mut serialized_order, trigger_price_b);
        vector::append(&mut serialized_order, maker_address_b);
        vector::append(&mut serialized_order, reduce_only_b);
        vector::append(&mut serialized_order, is_buy_b);

        return hash::sha2_256(serialized_order)

    }


    fun create_order(ordersTable: &mut Table<vector<u8>, OrderStatus>, hash: vector<u8>){
        // if the order does not already exists on-chain
        if (!table::contains(ordersTable, hash)){
            table::add(ordersTable, hash, OrderStatus {status:true, filledQty: 0});
        };
    }


    fun verify_order(perp: &mut Perpetual, ordersTable: &mut Table<vector<u8>, OrderStatus>, order: Order, hash: vector<u8>, fill:Fill, isTaker: u64){

            verify_order_state(ordersTable, hash, isTaker);

            verify_order_signature(order, hash, isTaker);

            verify_order_expiry(order, isTaker);

            verify_order_fills(perp, order, fill, isTaker);

            verify_order_leverage(perp, order, isTaker);

            verify_and_fill_order_qty(ordersTable, order, hash, fill.quantity, isTaker);
    }

    fun verify_order_state(ordersTable: &mut Table<vector<u8>, OrderStatus>, hash:vector<u8>, isTaker:u64){        
        let orderStatus = table::borrow(ordersTable, hash);
        assert!(orderStatus.status != false, error::order_has_invalid_signature(isTaker));
    }

    fun verify_and_fill_order_qty(ordersTable: &mut Table<vector<u8>, OrderStatus>, order:Order, orderHash:vector<u8>, fill:u128, isTaker:u64){
        
        let orderStatus = table::borrow_mut(ordersTable, orderHash);
        orderStatus.filledQty = orderStatus.filledQty + fill;

        assert!(orderStatus.filledQty  <=  order.quantity,  error::cannot_overfill_order(isTaker));

        emit(OrderFill{
                orderHash,
                order,
                fill,
                filledQuantity: orderStatus.filledQty
            });
    }


    fun verify_order_signature(order:Order, hash:vector<u8>, isTaker:u64){

        let publicKey = ecdsa_k1::ecrecover(&order.signature, &hash);

        let publicAddress = library::get_public_address(publicKey);

        assert!(order.makerAddress == publicAddress, error::order_has_invalid_signature(isTaker));
    }

    fun verify_order_expiry(order:Order, isTaker:u64){
        // TODO compare with chain time
        assert!(order.expiration == 0 || order.expiration > 1, error::order_has_expired(isTaker));
    }

    fun verify_order_fills(perp: &mut Perpetual, order:Order, fill:Fill, isTaker:u64){

        let oraclePrice = price_oracle::price(perpetual::priceOracle(perp));

        // Ensure order is being filled at the specified or better price
        // For long/buy orders, the fill price must be equal or lower
        // For short/sell orders, the fill price must be equal or higher
        let validPrice = if (order.isBuy) { fill.price <= order.price } else {fill.price >= order.price};

        assert!(validPrice, error::fill_price_invalid(isTaker));


        // When triggerPrice is specified (for stop orders), ensure the trigger condition has been met. Will be 0 for market & limit orders.
        if (order.triggerPrice != 0) {
            let validTriggerPrice =  if (order.isBuy) { order.triggerPrice <= oraclePrice } else { order.triggerPrice >= oraclePrice };
            assert!(validTriggerPrice, error::trigger_price_not_reached(isTaker));
        };

        // For reduce only orders, ensure that the order would result in an
        // open position's size to reduce (fill amount <= open position size)
        let userPosition = *table::borrow(perpetual::positions(perp), order.makerAddress);

        if(order.reduceOnly){

            // Reduce only order must be in the opposite direction as open position 
            // (a positive position size means open position is Buy)
            // Reduce only order size must be less than open position size.
            // Size sign is stored separately (sizeIsPositive) so this is an absolute value comparison
            // regardless of position direction (Buy or Sell)
            assert!(
                order.isBuy != position::isPosPositive(userPosition) && 
                fill.quantity <= position::qPos(userPosition), 
                error::fill_does_not_decrease_size(isTaker));        
        }

    }

    fun verify_order_leverage(perp: &mut Perpetual, order:Order, isTaker:u64){

        let userPosition = *table::borrow(perpetual::positions(perp), order.makerAddress);
        let mro = position::mro(userPosition);

        assert!(order.leverage > 0, error::leverage_must_be_greater_than_zero(isTaker));        
        assert!(
            mro == 0 || position::compute_mro(order.leverage) == mro, 
            error::invalid_leverage(isTaker));

    }

    fun apply_isolated_margin(checks:TradeChecks, balance: &mut UserPosition, order:Order, fill:Fill, feePerUnit: u128, isTaker: u64): IMResponse {
        
        let marginPerUnit;
        let fundsFlow;
        let pnlPerUnit = signed_number::new();
        let equityPerUnit;

        let isBuy = order.isBuy;
        
        let oiOpen = position::oiOpen(*balance);
        let qPos = position::qPos(*balance);
        let isPosPositive = position::isPosPositive(*balance);
        let margin = position::margin(*balance);
        let mro = position::compute_mro(order.leverage);

        let pPos = if ( qPos == 0 ) { 0 } else { library::base_div(oiOpen, qPos) }; 

        // case 1: Opening position or adding to position size
        if (qPos == 0 || isBuy == isPosPositive) {
            marginPerUnit = signed_number::from(library::base_mul(fill.price, mro), true);
            fundsFlow = signed_number::from(library::base_mul(fill.quantity, signed_number::value(marginPerUnit) + feePerUnit), true);
            let updatedOiOpen = oiOpen + library::base_mul(fill.quantity, fill.price);

            position::set_oiOpen(balance, updatedOiOpen);
            position::set_qPos(balance, qPos + fill.quantity);
            position::set_margin(balance, margin + library::base_mul(library::base_mul(fill.quantity, fill.price), mro));
            position::set_isPosPositive(balance, isBuy);

            // verify that oi open checks still hold                       
            evaluator::verify_oi_open_for_account(
                checks, 
                mro,
                updatedOiOpen,
                isTaker
            );

        } 
        // case 2: Reduce only order
        else if (order.reduceOnly || ( isBuy != isPosPositive && fill.quantity <= qPos)){
            let newQPos = qPos - fill.quantity;
            marginPerUnit = signed_number::from(library::base_div(margin, qPos), true);

            pnlPerUnit = if ( isPosPositive ) { 
                signed_number::from_subtraction(fill.price, pPos) 
                } else { 
                signed_number::from_subtraction(pPos, fill.price) 
                };

            equityPerUnit = signed_number::add(marginPerUnit, copy pnlPerUnit);
            
            assert!(signed_number::gte_uint(equityPerUnit, 0), error::loss_exceeds_margin(isTaker));
            
            // Max(0, equityPerUnit);
            let posValue = signed_number::positive_value(equityPerUnit);
            
            feePerUnit = if ( feePerUnit > posValue ) { posValue } else { feePerUnit };

            fundsFlow = signed_number::sub_uint( 
                signed_number::mul_uint(
                    signed_number::add_uint(
                        signed_number::negate(pnlPerUnit), 
                        feePerUnit), 
                    fill.quantity),
                (margin * fill.quantity) / qPos);


            fundsFlow = signed_number::positive_number(fundsFlow);
            pnlPerUnit = signed_number::mul_uint(pnlPerUnit, fill.quantity);
            
            position::set_margin(balance, (margin*newQPos) / qPos);
            position::set_qPos(balance, newQPos);
            position::set_oiOpen(balance, (oiOpen * newQPos) / qPos);
            // even if new position size is zero we are setting isPosPositive to false
            // this is what default value for isPosPositive is
            if(newQPos == 0){
                position::set_isPosPositive(balance, false);
            };


        } 
        // case 3: flipping position side
        else {
            
            let newQPos = fill.quantity - qPos;
            let updatedOIOpen = library::base_mul(newQPos, fill.price);

            marginPerUnit = signed_number::from(library::base_div(margin, qPos), true);

            pnlPerUnit = if ( isPosPositive ) { 
                signed_number::from_subtraction(fill.price, pPos) 
            } else { 
                signed_number::from_subtraction(pPos, fill.price) 
            };

            equityPerUnit = signed_number::add(marginPerUnit, copy pnlPerUnit);


            assert!(signed_number::gte_uint(equityPerUnit, 0), error::loss_exceeds_margin(isTaker));

            // Max(0, equityPerUnit);
            let posValue = signed_number::positive_value(equityPerUnit);

            // fee paid on closing the current position            
            let closingFeePerUnit = if ( feePerUnit > posValue ) { posValue } else { feePerUnit };
            

            fundsFlow = signed_number::add_uint(
                            signed_number::sub_uint( 
                                signed_number::mul_uint(
                                    signed_number::add_uint(
                                        signed_number::negate(pnlPerUnit), 
                                        closingFeePerUnit), 
                                    qPos),
                                margin),
                            library::base_mul(
                                newQPos, 
                                library::base_mul(
                                    fill.price, 
                                    mro) 
                                + feePerUnit)
                        );

            feePerUnit = library::base_mul(qPos, closingFeePerUnit) 
                         + ((newQPos * feePerUnit) / fill.quantity);



            pnlPerUnit = signed_number::mul_uint(pnlPerUnit, qPos);

            // verify that oi open checks still hold                       
            evaluator::verify_oi_open_for_account(
                checks, 
                mro,
                updatedOIOpen,
                isTaker
            );

            position::set_qPos(balance, newQPos);
            position::set_oiOpen(balance, updatedOIOpen);
            position::set_margin(balance, library::base_mul(updatedOIOpen, mro));
            position::set_isPosPositive(balance, !isPosPositive);

        };

        //  if position is closed due to reducing trade reset mro to zero
        if (position::qPos(*balance) == 0) {
            position::set_mro(balance, 0);
        } else {
        // update user mro as per order
            position::set_mro(balance, mro);
        };

        return IMResponse {
            fundsFlow,
            pnlPerUnit,
            feePerUnit
        }

    }




}
