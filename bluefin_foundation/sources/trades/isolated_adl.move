module bluefin_foundation::isolated_adl {

    use sui::event::{emit};
    use sui::object::{Self, ID};
    use sui::table::{Self};

    // custom modules
    use bluefin_foundation::perpetual::{Self, PerpetualV2};
    use bluefin_foundation::position::{Self, UserPosition};
    use bluefin_foundation::evaluator::{Self};
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

    struct TradeExecutedV2 has copy, drop {
        tx_index:u128,
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

    struct IMResponse has drop {
        fundsFlow: Number,
        pnl: Number
    }

    struct TradeResponse has copy, drop {
        makerFundsFlow: Number,
        takerFundsFlow: Number
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

    // @dev only exchange module can invoke this
    public (friend) fun trade(sender: address, perp: &mut PerpetualV2, data:TradeData, tx_index:u128): TradeResponse{

        let perpID = object::uid_to_inner(perpetual::id_v2(perp));
        let imr = perpetual::imr_v2(perp);
        let mmr = perpetual::mmr_v2(perp);
        let oraclePrice = perpetual::priceOracle_v2(perp);
        let tradeChecks = perpetual::checks_v2(perp);
        let positionsTable = perpetual::positions(perp);
        
         // round oracle price to conform to tick size
        oraclePrice = library::round(oraclePrice, evaluator::tickSize(tradeChecks));

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

        // emit position updates
        position::emit_position_update_event(newMakerPos, sender, ACTION_TRADE, tx_index);
        position::emit_position_update_event(newTakerPos, sender, ACTION_TRADE, tx_index);

        emit(TradeExecutedV2{
            tx_index,
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

        return TradeResponse{
            makerFundsFlow:makerResponse.fundsFlow,
            takerFundsFlow:takerResponse.fundsFlow
        }

    }

    //===========================================================//
    //                      FRIEND METHODS
    //===========================================================//

    public (friend) fun pack_trade_data(maker:address, taker:address, quantity:u128, allOrNothing:bool):TradeData{
        return TradeData{
            maker,
            taker,
            quantity,
            allOrNothing
        }
    }

    public (friend) fun makerFundsFlow(resp:TradeResponse): Number{
        return resp.makerFundsFlow
    }
    
    public (friend) fun takerFundsFlow(resp:TradeResponse): Number{
        return resp.takerFundsFlow
    }

    public (friend) fun tradeType() : u8 {
        return TRADE_TYPE
    }

    //===========================================================//
    //                      HELPER METHODS
    //===========================================================//

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

        // current position - quantity
        let newQPos = qPos - quantity;

        // margin / current position size
        let marginPerUnit = signed_number::from(library::base_div(margin, qPos), true);
        
        // margin per unit + pnl per unit
        let equityPerUnit = signed_number::add(marginPerUnit, pnlPerUnit);

        // Cannot trade when loss exceeds margin
        assert!(
            signed_number::gte_uint(
                signed_number::add_uint(equityPerUnit,100000),
                0),
            error::loss_exceeds_margin(isTaker)
        );

        // (-pnl per unit * deleveraging quantity) 
        // - ((margin * quantity) / current position size)
        let fundsFlow = signed_number::sub_uint( 
                    signed_number::mul_uint(
                        signed_number::negate(pnlPerUnit), 
                        quantity),
                    (margin * quantity) / qPos);

        // negate funds flow
        fundsFlow = signed_number::negative_number(fundsFlow);

            
        // this pnl is no longer per unit now
        pnlPerUnit = signed_number::mul_uint(pnlPerUnit, quantity);

        // (current margin * new pos size) / old pos size
        position::set_margin(balance, (margin * newQPos) / qPos);

        // (current oi open * new pos size) / old pos size
        position::set_oiOpen(balance, (oiOpen * newQPos) / qPos);

        position::set_qPos(balance, newQPos);
   
        return IMResponse {
            fundsFlow: fundsFlow,
            pnl: pnlPerUnit
        }
    }
}