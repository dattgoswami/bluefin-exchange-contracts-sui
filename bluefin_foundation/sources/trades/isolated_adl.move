module bluefin_foundation::isolated_adl {

    use sui::event::{emit};
    use sui::object::{Self, ID};
    use sui::table::{Self};

    use bluefin_foundation::perpetual::{Self, Perpetual};
    use bluefin_foundation::position::{Self, UserPosition};
    use bluefin_foundation::margin_bank::{Self, Bank};
    use bluefin_foundation::price_oracle::{Self};
    use bluefin_foundation::evaluator::{Self};
    use bluefin_foundation::signed_number::{Self, Number};
    use bluefin_foundation::library::{Self};
    use bluefin_foundation::error::{Self};

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
        // below water account to be deleveraged
        maker: address,
        // taker in profit
        taker: address,        
        // quantity of trade
        quantity: u128,
        // if true, will revert if maker's position is less than the amount
        allOrNothing: bool
    }

    struct IMResponse has store, drop {
        fundsFlow: Number,
        pnl: Number
    }

    //===========================================================//
    //                      CONSTANTS
    //===========================================================//

    // trade type
    const TRADE_TYPE: u8 = 3;

    // action types
    const ACTION_TRADE: u8 = 0;

    //===========================================================//
    //                      TRADE METHOD                         //
    //===========================================================//
    public fun trade(sender: address, perp: &mut Perpetual, bank: &mut Bank, data:TradeData){

        let perpID = object::uid_to_inner(perpetual::id(perp));
        let perpAddress = object::id_to_address(&perpID);
        let imr = perpetual::imr(perp);
        let mmr = perpetual::mmr(perp);
        let oraclePrice = price_oracle::price(perpetual::priceOracle(perp));
        let tradeChecks = perpetual::checks(perp);
        let positionsTable = perpetual::positions(perp);
        
         // round oracle price to conform to tick size
        oraclePrice = library::round(oraclePrice, evaluator::tickSize(tradeChecks));

        // maker must have a position object
        assert!(
            table::contains(positionsTable, data.maker), 
            error::user_has_no_position_in_table(0));

        // taker must have a position object
        assert!(
            table::contains(positionsTable, data.taker), 
            error::user_has_no_position_in_table(1));

        // verify pre-trade checks
        evaluator::verify_min_max_price(tradeChecks, oraclePrice);
        evaluator::verify_qty_checks(tradeChecks, data.quantity);

        let makerPos = *table::borrow(positionsTable, data.maker);
        let takerPos = *table::borrow(positionsTable, data.taker);

        // from taker's perspective
        let isBuy = position::isPosPositive(makerPos);

        // check if deleveraging is possible
        verify_trade(
            makerPos,
            takerPos,
            data,
            oraclePrice
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

        // bound the execution quantity by the size of min(maker,taker) position.
        let quantity = library::min(
            data.quantity, 
            library::min(
                position::qPos(makerPos),
                position::qPos(takerPos)
                )
            );
        
        // apply isolated margin to maker/liquidatee
        let makerResponse = apply_isolated_margin(
                table::borrow_mut(positionsTable, data.maker),
                quantity,
                bankruptcyPrice,
                0
            );

        // apply isolated margin to taker/liquidator
        let takerResponse = apply_isolated_margin(
                table::borrow_mut(positionsTable, data.taker), 
                quantity,
                bankruptcyPrice,
                1
            );

        let newMakerPos = *table::borrow(positionsTable, data.maker);
        let newTakerPos = *table::borrow(positionsTable, data.taker);
                                
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
        
        
        // transfer margins between perp and accounts
        margin_bank::transfer_trade_margin(
                bank,
                perpAddress,
                data.maker,
                data.taker,
                makerResponse.fundsFlow,
                takerResponse.fundsFlow
            );

        // emit position updates
        position::emit_position_update_event(perpID, data.maker, newMakerPos, ACTION_TRADE);
        position::emit_position_update_event(perpID, data.taker, newTakerPos, ACTION_TRADE);

        emit(TradeExecuted{
            sender,
            perpID,
            tradeType: TRADE_TYPE,
            maker: data.maker,
            taker: data.taker,
            makerMRO: position::mro(newMakerPos),
            takerMRO: position::mro(newTakerPos),
            makerPnl: makerResponse.pnl,
            takerPnl: takerResponse.pnl,
            tradeQuantity: data.quantity,
            tradePrice: bankruptcyPrice,
            isBuy: isBuy,
        });

    }

    //===========================================================//
    //                      HELPER METHODS
    //===========================================================//

    public fun pack_trade_data(maker:address, taker:address, quantity:u128, allOrNothing:bool):TradeData{
        return TradeData{
            maker,
            taker,
            quantity,
            allOrNothing
        }
    }

    /**
     * @dev verifies if the liquidation is possible or not
     * @param  makerPos   position balance of account to be liquidated
     * @param  takerPos   positon balance of liquidator
     * @param  data   the trade data passed to trade method
     * @param  price   Current oracle price of asset
     */
    fun verify_trade(
        makerPos: UserPosition,
        takerPos: UserPosition,
        data: TradeData,
        price: u128,
    ){

        // verify maker
        verify_account(makerPos, data, 0);

        // verify taker
        verify_account(takerPos, data, 1);

        assert!(
            signed_number::lte_uint(position::compute_margin_ratio(makerPos, price), 0),
            error::maker_is_not_underwater(),
        );

        assert!(
            signed_number::gt_uint(position::compute_margin_ratio(takerPos, price), 0),
            error::taker_is_under_underwater(),
        );

        assert!(
            position::isPosPositive(makerPos) != position::isPosPositive(takerPos), 
            error::maker_taker_must_have_opposite_side_positions()
        );
    }

    fun verify_account(pos:UserPosition, data: TradeData, isTaker:u64){

        assert!(position::qPos(pos) > 0, error::user_position_size_is_zero(isTaker));

        assert!(
            !data.allOrNothing || position::qPos(pos) >= data.quantity,
            error::adl_all_or_nothing_constraint_can_not_be_held(isTaker)
        );
    }

    fun apply_isolated_margin(
        balance: &mut UserPosition,
        quantity: u128,
        bankruptcyPrice: u128,
        isTaker: u64
    ): IMResponse {
        
        let oiOpen = position::oiOpen(*balance);
        let qPos = position::qPos(*balance);
        let margin = position::margin(*balance);

        let pnlPerUnit = position::compute_pnl_per_unit(*balance, bankruptcyPrice);

        let newQPos = qPos - quantity;
        let marginPerUnit = signed_number::from(library::base_div(margin, qPos), true);
        let equityPerUnit = signed_number::add(marginPerUnit, pnlPerUnit);

        // Cannot trade when loss exceeds margin
        assert!(
            signed_number::gte_uint(
                signed_number::add_uint(equityPerUnit,100000),
                0),
            error::loss_exceeds_margin(isTaker)
        );

        let fundsFlow = signed_number::sub_uint( 
                    signed_number::mul_uint(
                        signed_number::negate(pnlPerUnit), 
                        quantity),
                    (margin * quantity) / qPos);

        fundsFlow = signed_number::negative_number(fundsFlow);

            
        // this pnl is no longer per unit now
        pnlPerUnit = signed_number::mul_uint(pnlPerUnit, quantity);

        position::set_margin(balance, (margin * newQPos) / qPos);
        position::set_oiOpen(balance, (oiOpen * newQPos) / qPos);
        position::set_qPos(balance, newQPos);
   
        return IMResponse {
            fundsFlow: fundsFlow,
            pnl: pnlPerUnit
        }
    }

    
    
}