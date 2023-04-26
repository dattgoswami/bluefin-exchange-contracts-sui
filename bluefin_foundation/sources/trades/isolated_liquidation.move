module bluefin_foundation::isolated_liquidation {

    use sui::event::{emit};
    use sui::object::{Self, ID};
    use sui::table::{Self};

    // custom modules
    use bluefin_foundation::perpetual::{Self, Perpetual};
    use bluefin_foundation::position::{Self, UserPosition};
    use bluefin_foundation::price_oracle::{Self};
    use bluefin_foundation::evaluator::{Self, TradeChecks};
    use bluefin_foundation::signed_number::{Self, Number};
    use bluefin_foundation::library::{Self};
    use bluefin_foundation::error::{Self};

    // friend modules
    friend bluefin_foundation::exchange;

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct TradeExecuted has copy, drop {
        sender:address,
        perpID: ID,
        tradeType: u8,
        maker: address,
        taker: address,
        makerMRO: u128,
        takerMRO: u128,
        makerPnl: Number,
        takerPnl: Number,
        tradeQuantity: u128,
        tradePrice: u128,
        isBuy: bool
    }

    //===========================================================//
    //                           STORAGE                         //
    //===========================================================//

    struct TradeData has drop, copy {
        // address of liquidator
        liquidator: address,
        // liquidatee/maker to be liquidated
        liquidatee: address,        
        // quantity of trade
        quantity: u128,
        // leverage for taker/liquidator
        leverage: u128,
        // if true, will revert if maker's position is less than the amount
        allOrNothing: bool
    }

    struct IMResponse has drop {
        fundsFlow: Number,
        pnl: Number
    }

    struct Premium has copy, store, drop {
        pool: Number,
        liquidator: Number
    }

    struct TradeResponse has copy, store, drop {
        makerFundsFlow: Number,
        takerFundsFlow: Number,
        premium: Premium
    }

    //===========================================================//
    //                      CONSTANTS
    //===========================================================//

    // trade type
    const TRADE_TYPE: u8 = 2;

    // action types
    const ACTION_TRADE: u8 = 0;

    //===========================================================//
    //                      TRADE METHOD                         //
    //===========================================================//

    // @dev only exchange module can invoke this
    public (friend) fun trade(sender: address, perp: &mut Perpetual, data:TradeData): TradeResponse{

        assert!(perpetual::is_trading_permitted(perp), error::perpetual_is_denied_trading());
        let perpID = object::uid_to_inner(perpetual::id(perp));
        let imr = perpetual::imr(perp);
        let mmr = perpetual::mmr(perp);
        let oraclePrice = price_oracle::price(perpetual::priceOracle(perp));
        let tradeChecks = perpetual::checks(perp);
        let insurancePoolRatio = perpetual::poolPercentage(perp);
        let positionsTable = perpetual::positions(perp);
        
         // round oracle price to conform to tick size
        oraclePrice = library::round(oraclePrice, evaluator::tickSize(tradeChecks));

        // liquidatee, maker must have a position in table
        assert!(
            table::contains(positionsTable, data.liquidatee), 
            error::user_has_no_position_in_table(0));

        // verify pre-trade checks
        evaluator::verify_min_max_price(tradeChecks, oraclePrice);
        evaluator::verify_qty_checks(tradeChecks, data.quantity);

        // create liquidator's position if not exists
        position::create_position(perpID, positionsTable, data.liquidator);


        let makerPos = *table::borrow(positionsTable, data.liquidatee);
        let takerPos = *table::borrow(positionsTable, data.liquidator);

        let isBuy = position::isPosPositive(makerPos);

        // check if liquidation is possible
        verify_trade(
            data,
            makerPos,
            takerPos,
            oraclePrice,
            mmr
        );

        // compute bankruptcy price
        // @dev oiOpen will always be  > margin else liquidation is not possible
        // bankruptcy = debt / qPos
        let bankruptcyPrice = if (position::isPosPositive(makerPos)){
            library::base_div(
                position::oiOpen(makerPos) - 
                position::margin(makerPos),
                position::qPos(makerPos))
            } else {
            library::base_div(
                position::oiOpen(makerPos) + 
                position::margin(makerPos),
                position::qPos(makerPos))
            };

        // bound the execution quantity by the size of the maker position.
        let quantity = library::min(data.quantity, position::qPos(makerPos));
        
        // apply isolated margin to maker/liquidatee
        let makerResponse = apply_isolated_margin(
                table::borrow_mut(positionsTable, data.liquidatee),
                tradeChecks,
                quantity,
                oraclePrice,
                bankruptcyPrice,
                position::mro(makerPos),
                !position::isPosPositive(makerPos),
                0
            );

        // apply isolated margin to taker/liquidator
        let takerResponse = apply_isolated_margin(
                table::borrow_mut(positionsTable, data.liquidator), 
                tradeChecks,
                quantity,
                oraclePrice,
                bankruptcyPrice,
                position::compute_mro(data.leverage),
                position::isPosPositive(makerPos),
                1
            );

        let newMakerPos = *table::borrow(positionsTable, data.liquidatee);
        let newTakerPos = *table::borrow(positionsTable, data.liquidator);
                                
        // verify collateralization of maker and take
        position::verify_collat_checks(
            makerPos, 
            newMakerPos, 
            imr, 
            mmr, 
            oraclePrice, 
            TRADE_TYPE, 
            0);

        position::verify_collat_checks(
            takerPos, 
            newTakerPos, 
            imr, 
            mmr, 
            oraclePrice, 
            TRADE_TYPE, 
            1);
        
        
        // compute liquidaiton premium
        let premium =  calculate_premium(
            isBuy, 
            quantity, 
            oraclePrice, 
            bankruptcyPrice, 
            insurancePoolRatio
        );

        // if position was liquidated above bankruptcy, liquidator earned a premium
        // else paid to system to keep perpetual solvent, in that case it has a negative
        // pnl
        takerResponse.pnl = signed_number::add(premium.liquidator, takerResponse.pnl);

        // emit position updates
        position::emit_position_update_event(perpID, data.liquidatee, newMakerPos, ACTION_TRADE);
        position::emit_position_update_event(perpID, data.liquidator, newTakerPos, ACTION_TRADE);

        emit(TradeExecuted{
            sender,
            perpID,
            tradeType: TRADE_TYPE,
            maker: data.liquidatee,
            taker: data.liquidator,
            makerMRO: position::mro(newMakerPos),
            takerMRO: position::mro(newTakerPos),
            makerPnl: makerResponse.pnl,
            takerPnl: takerResponse.pnl,
            tradeQuantity: data.quantity,
            tradePrice: oraclePrice,
            isBuy: isBuy,
        });

            return TradeResponse{
                makerFundsFlow: makerResponse.fundsFlow,
                takerFundsFlow: takerResponse.fundsFlow,
                premium
            }
    }

    //===========================================================//
    //                      FRIEND FUNCTIONS                     //
    //===========================================================//

    public (friend) fun pack_trade_data(liquidator:address, liquidatee:address, quantity:u128, leverage:u128, allOrNothing:bool):TradeData{
        return TradeData{
            liquidator,
            liquidatee,
            quantity,
            leverage,
            allOrNothing
        }
    }

    public (friend) fun makerFundsFlow(resp:TradeResponse): Number{
        return resp.makerFundsFlow
    }
    
    public (friend) fun takerFundsFlow(resp:TradeResponse): Number{
        return resp.takerFundsFlow
    }

    public (friend) fun liquidatorPortion(resp:TradeResponse): Number{
        return resp.premium.liquidator
    }

    public (friend) fun insurancePoolPortion(resp:TradeResponse): Number{
        return resp.premium.pool
    }

    //===========================================================//
    //                      HELPER METHODS
    //===========================================================//
    
    /**
     * @dev verifies if the liquidation is possible or not
     * @param  tradeData   the data passed to trade method
     * @param  makerBalance   position balance of account to be liquidated
     * @param  takerBalance   positon balance of liquidator
     * @param  price   Current oracle price of asset
     * @param  mmr   Maintenance margin ratio
     */
    fun verify_trade(
        data: TradeData,
        makerPos: UserPosition,
        takerPos: UserPosition,
        price: u128,
        mmr:u128
    ){

        assert!(position::qPos(makerPos) > 0, error::user_position_size_is_zero(0));

        assert!(
            position::is_undercollat(makerPos, price, mmr),
            error::liquidatee_above_mmr(),
        );

        assert!(
            !data.allOrNothing || position::qPos(makerPos) >= data.quantity,
            error::liquidation_all_or_nothing_constraint_not_held());

        assert!(
            position::mro(takerPos) == 0 || position::compute_mro(data.leverage) == position::mro(takerPos),
            error::invalid_liquidator_leverage());    
    }

    fun apply_isolated_margin(
        balance: &mut UserPosition,
        checks: TradeChecks,
        quantity: u128,
        oraclePrice: u128,
        bankruptcyPrice: u128,
        mro: u128,
        isBuy: bool,
        isTaker: u64
    ): IMResponse {
        
        let fundsFlow: Number;
        let equityPerUnit: Number;
        let marginPerUnit: u128;

        let oiOpen = position::oiOpen(*balance);
        let qPos = position::qPos(*balance);
        let isPosPositive = position::isPosPositive(*balance);
        let margin = position::margin(*balance);

        let pnlPerUnit = position::compute_pnl_per_unit(*balance, oraclePrice);

        // case 1: Opening position or adding to position size
        if (qPos == 0 || isBuy == isPosPositive) {

            // oracle price * mro
            marginPerUnit = library::base_mul(oraclePrice, mro);

            // quantity *  ((oracle price * mro))
            fundsFlow = signed_number::from(library::base_mul(quantity, marginPerUnit), true);

            // current oi open + quantity * oracle price
            position::set_oiOpen(balance, oiOpen + library::base_mul(quantity, oraclePrice));

            // current position size + fill quantity
            position::set_qPos(balance, qPos + quantity);

            // current margin + (quantity * (price * mro)) 
            position::set_margin(balance, margin + library::base_mul(quantity, marginPerUnit));
            
            position::set_isPosPositive(balance, isBuy);

            // verify that oi open checks still hold                       
            evaluator::verify_oi_open_for_account(
                checks, 
                mro,
                position::oiOpen(*balance),
                isTaker
            );

            pnlPerUnit = signed_number::new();
        }
        // case 2: Reduce only order
        else if (isBuy != isPosPositive && quantity <= qPos){
            // current position - fill quantity
            let newQPos = qPos - quantity;

            // current margin / current position size
            marginPerUnit = library::base_div(margin, qPos);

            // if liquidator
            if(isTaker == 1){
                // equityPerUnit + marginPerUnit
                equityPerUnit = signed_number::add_uint(pnlPerUnit, marginPerUnit);

                assert!(
                    signed_number::gte_uint(equityPerUnit, 0),
                    error::loss_exceeds_margin(isTaker));

                // (-pnl per unit * fill quantity) 
                // - ((current user margin * fill quantity) / current user position size)  

                fundsFlow = signed_number::sub_uint( 
                            signed_number::mul_uint(
                                signed_number::negate(pnlPerUnit), 
                                quantity),
                            (margin * quantity) / qPos);

                // negate fundsflow
                fundsFlow = signed_number::negative_number(fundsFlow);

            } else {
                // pnl for maker/liquidatee is based on bankruptcy price
                pnlPerUnit = position::compute_pnl_per_unit(*balance, bankruptcyPrice);
                // funds flow for maker/liquidatee is zero
                fundsFlow = signed_number::new();
            };
            
            // this pnl is no longer per unit now
            pnlPerUnit = signed_number::mul_uint(pnlPerUnit, quantity);

            // (current margin * new pos size) / old pos size
            position::set_margin(balance, (margin * newQPos) / qPos);

            // (current oi open * new pos size) / old pos size
            position::set_oiOpen(balance, (oiOpen * newQPos) / qPos);

            position::set_qPos(balance, newQPos);

        }
        // case 3: flipping position side
        else {
            // fill quantity - current position size
            let newQPos = quantity - qPos;

            // new position size * oracle price
            let updatedOIOpen = library::base_mul(newQPos, oraclePrice);
            
            // new position size * oracle price * mro
            let newMargin = library::base_mul(updatedOIOpen, mro);


            // current margin / current position size
            marginPerUnit = library::base_div(margin, qPos);

            // pnl per unit + margin per unit
            equityPerUnit = signed_number::add_uint(pnlPerUnit, marginPerUnit);

            assert!(signed_number::gte_uint(equityPerUnit, 0), error::loss_exceeds_margin(isTaker));

            // ((-pnl per unit * current position size) - margin) 
            // + new position size * oracle price * mro
            fundsFlow =  signed_number::add_uint(
                    signed_number::sub_uint(
                        signed_number::mul_uint(
                            signed_number::negate(pnlPerUnit),
                            qPos),
                        margin),
                    newMargin
                );

            // verify that oi open checks still hold                       
            evaluator::verify_oi_open_for_account(
                checks, 
                mro,
                updatedOIOpen,
                isTaker
            );

            // this pnl is no longer per unit now
            pnlPerUnit = signed_number::mul_uint(pnlPerUnit, qPos);            

            position::set_qPos(balance, newQPos);
            position::set_oiOpen(balance, updatedOIOpen);
            position::set_margin(balance, newMargin);
            position::set_isPosPositive(balance, !isPosPositive);


        };

        position::set_mro(balance, mro);

        return IMResponse {
            fundsFlow: fundsFlow,
            pnl: pnlPerUnit
        }
    }

    fun calculate_premium(
        isMakerPosPositive: bool, 
        quantity: u128, 
        oraclePrice: u128, 
        bankruptcyPrice: u128, 
        insurancePoolRatio: u128
    ): Premium {

        // total premium earned on liquidation
        let premium: Number;

        // condition to determine if liquidation happened before
        // bankruptcy or not
        let condition: bool;

        // preimum portions
        let pool = signed_number::new();
        let liquidator: Number;

        // compute premium per unit
        if(isMakerPosPositive){

            premium = signed_number::from_subtraction(oraclePrice, bankruptcyPrice);
            condition = { oraclePrice >= bankruptcyPrice };

        } else {

            premium = signed_number::from_subtraction(bankruptcyPrice, oraclePrice);
            condition = { oraclePrice <= bankruptcyPrice };
        };

        premium = signed_number::mul_uint(premium, quantity);

        if (condition == true){
            pool = signed_number::mul_uint(premium, insurancePoolRatio);
            liquidator = signed_number::mul_uint(premium, library::base_uint() - insurancePoolRatio);
        } else {
            // keep liquidatorsPortion negative
            liquidator = premium;
        };  

        return Premium{
            pool,
            liquidator
        }
    }
    
}