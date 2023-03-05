module bluefin_foundation::roles {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::event::{emit};
    use sui::table::{Self, Table};
    use sui::transfer;

    // custom modules
    use bluefin_foundation::error::{Self};

    // friend modules
    friend bluefin_foundation::exchange;

    //===========================================================//
    //                           EVENTS                          //
    //===========================================================//

    struct ExchangeAdminUpdateEvent has copy, drop {
        account:address,
    }

    struct ExchangeGuardianUpdateEvent has copy, drop {
        account:address,
    }


    struct SettlementOperatorUpdateEvent has copy, drop {
        account:address,
        status: bool
    }

    struct PriceOracleOperatorUpdateEvent has copy, drop {
        id: ID, 
        account:address
    }

    //===========================================================//
    //                           STORAGE                         //
    //===========================================================//

    struct ExchangeAdminCap has key {
        id: UID,
    }

    struct ExchangeGuardianCap has key {
        id: UID,
    }

    struct PriceOracleOperatorCap has key {
        id: UID,
        account: address,
        perpetualID: ID
    }


    //===========================================================//
    //                       FRIEND FUNCTIONS                    //
    //===========================================================//

    public(friend) fun create_exchange_admin(ctx: &mut TxContext){

        let admin = ExchangeAdminCap {
            id: object::new(ctx),
        };

        transfer::transfer(admin, tx_context::sender(ctx));

        emit(ExchangeAdminUpdateEvent{account: tx_context::sender(ctx)});
    }

    public(friend) fun create_exchange_guardian(ctx: &mut TxContext){

        let admin = ExchangeGuardianCap {
            id: object::new(ctx),
        };

        transfer::transfer(admin, tx_context::sender(ctx));

        emit(ExchangeGuardianUpdateEvent{account: tx_context::sender(ctx)});
    }

    public(friend) fun initialize_settlement_operators_table(ctx: &mut TxContext){
        transfer::share_object(table::new<address, bool>(ctx));  
    }

    public (friend) fun create_price_oracle_operator(perp: ID, ctx: &mut TxContext){
        
        let operatorCap = PriceOracleOperatorCap{
            id: object::new(ctx),
            account: tx_context::sender(ctx),
            perpetualID: perp
        };
        
        transfer::share_object(operatorCap);

        emit(PriceOracleOperatorUpdateEvent{ 
            id: perp,
            account: tx_context::sender(ctx) 
        });

    }

    //===========================================================//
    //                      ENTRY METHODS                        //
    //===========================================================//

    /**
     * Transfers adminship of exchange to provided address
     */
    entry fun transfer_exchange_admin(admin: ExchangeAdminCap, newAdmin:address, ctx: &mut TxContext){
        assert!(
            newAdmin != tx_context::sender(ctx), 
            error::new_exchange_admin_can_not_be_same_as_current_one());

        transfer::transfer(admin, newAdmin);

        emit(ExchangeAdminUpdateEvent{account: newAdmin});

    }

    /**
     * Updates status(active/inactive) of settlement operator
     * Only Admin can invoke this method
     */
    entry fun set_settlement_operator(_:&ExchangeAdminCap, operatorTable: &mut Table<address, bool>, operator:address, status:bool){
        
        if(table::contains(operatorTable, operator)){
            assert!(status == false, error::operator_already_whitelisted_for_settlement());
            table::remove(operatorTable, operator); 
        } else {
            assert!(status == true, error::operator_not_found());
            table::add(operatorTable, operator, true);
        };

        emit(SettlementOperatorUpdateEvent {
            account: operator,
            status: status
        });
    }    

    /**
     * Updates price oracle operator address for given price oracle operator cap
     */
    entry fun set_price_oracle_operator(_:&ExchangeAdminCap, cap: &mut PriceOracleOperatorCap, operator: address){
        assert!(cap.account != operator, error::already_price_oracle_operator());

        cap.account = operator;

        emit(PriceOracleOperatorUpdateEvent{ 
            id: cap.perpetualID,
            account: operator 
        });
    }

    //===========================================================//
    //                      HELPER METHODS                       //
    //===========================================================//

    public fun is_valid_price_oracle_operator(
        cap: &PriceOracleOperatorCap,
        perpetual: ID,
        caller: address
        ):bool{        
        return cap.perpetualID == perpetual && cap.account == caller
    }
}