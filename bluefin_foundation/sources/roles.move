module bluefin_foundation::roles {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::vec_set::{Self, VecSet};
    use sui::table::{Self, Table};
    use sui::event::{emit};
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
        id: ID,
        account:address,
    }

    struct SettlementOperatorCreationEvent has copy, drop {
        id: ID,
        account:address
    }

    struct SettlementOperatorRemovalEvent has copy, drop {
        id: ID
    }


    struct PriceOracleOperatorUpdate has copy, drop {
        id: ID,
        account:address
    }

    struct DelevergingOperatorUpdate has copy, drop {
        id: ID,
        account:address
    }

    struct SubAccountUpdateEvent has copy, drop {
            account: address,
            subAccount: address,
            status: bool
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
        id: UID
    }

    struct SettlementCap has key {
        id: UID
    }

    struct DeleveragingCap has key {
        id: UID
    }

    struct CapabilitiesSafe has key {
        id: UID,
        // there can only be one guardian
        guardian: ID,
        // address of price oracle operator
        priceOracleOperator: ID,
        // address of deleveraging operator
        deleveraging: ID,
        // there can be N different settlement operators
        settlementOperators: VecSet<ID>,
        // public settlement cap, any taker can use to perform trade
        publicSettlementCap: ID
    }

    struct SubAccounts has key {
        id: UID,
        map:Table<address,VecSet<address>>
    }

    //===========================================================//
    //                      INITIALIZATION
    //===========================================================//

    fun init(ctx: &mut TxContext) {
        
        // make deployer exchange admin
        create_exchange_admin(ctx);

        // create exchange guardian 
        let guardianID = create_exchange_guardian(tx_context::sender(ctx), ctx);

        // create exchange price oracle operator
        let pooID = create_price_oracle_operator(tx_context::sender(ctx), ctx);

        // create deleveraging operator
        let deleveragerID = create_deleveraging_operator(tx_context::sender(ctx), ctx);

        // create public settlement capabity 
        // this settlement cap can be use by any taker in the world, its not 
        // added to the list of settlementOperators: VecSet<ID>
        let objID = object::new(ctx);
        let publicSettlementCapID = object::uid_to_inner(&objID);  
        transfer::share_object(SettlementCap{
            id: objID
        });

        let safe = CapabilitiesSafe {
            id: object::new(ctx),
            guardian: guardianID,
            priceOracleOperator: pooID,
            deleveraging: deleveragerID,
            settlementOperators: vec_set::empty(),
            publicSettlementCap: publicSettlementCapID
        };

        // share safe
        transfer::share_object(safe);

        // create sub accounts map
        let subAccounts = SubAccounts{id: object::new(ctx), map: table::new<address, VecSet<address>>(ctx)};
        transfer::share_object(subAccounts);          
    }
   
    //===========================================================//
    //                      ENTRY METHODS                        //
    //===========================================================//

    /**
     * Transfers adminship of exchange to provided address
     * Only exchange admin can invoke this method
     */
    entry fun set_exchange_admin(admin: ExchangeAdminCap, newAdmin:address, ctx: &mut TxContext){
        assert!(
            newAdmin != tx_context::sender(ctx), 
            error::new_address_can_not_be_same_as_current_one());

        transfer::transfer(admin, newAdmin);

        emit(ExchangeAdminUpdateEvent{account: newAdmin});
    }

    /**
     * Transfers guardianship of exchange to provided address
     * Only exchange admin can invoke this method
     */
    entry fun set_exchange_guardian(_: &ExchangeAdminCap, safe: &mut CapabilitiesSafe, newGuardian:address, ctx: &mut TxContext){
        // update new id in safe
        safe.guardian = create_exchange_guardian(newGuardian, ctx);
    }

    /**
     * Creates price oracle operator
     * Only exchange admin can invoke this method
     */
    public entry fun set_price_oracle_operator(
        _:&ExchangeAdminCap, 
        safe: &mut CapabilitiesSafe, 
        newOperator: address, 
        ctx: &mut TxContext
        ){

        // update new id address in safe
        safe.priceOracleOperator = create_price_oracle_operator(newOperator, ctx);

    }


    /**
     * Creates deleveraing operator
     * Only exchange admin can invoke this method
     */
    public entry fun set_deleveraging_operator(
        _:&ExchangeAdminCap, 
        safe: &mut CapabilitiesSafe, 
        newOperator: address, 
        ctx: &mut TxContext
        ){

        // update new id address in safe
        safe.deleveraging = create_deleveraging_operator(newOperator, ctx);

    }


    /**
     * Creates and transfers settlement operator capability
     * Only Admin can invoke this method
     */
    entry fun create_settlement_operator(
        _:&ExchangeAdminCap, 
        safe: &mut CapabilitiesSafe, 
        operator:address, 
        ctx: &mut TxContext
        ){

        // create new settlement  operator
        let operatorCap = SettlementCap{
            id: object::new(ctx)
        };
        
        emit(SettlementOperatorCreationEvent{ 
            id: object::uid_to_inner(&operatorCap.id),
            account: operator 
        });
        
        // insert newly created settlement oracle operator to safe
        vec_set::insert(&mut safe.settlementOperators, object::uid_to_inner(&operatorCap.id));

        // transfer capability to operator
        transfer::transfer(operatorCap, operator);
        
    }
        

    /**
     * Removes settlement oracle operator capability from safe
     * Only exchange admin can invoke this method
     */
    entry fun remove_settlement_operator(_: &ExchangeAdminCap, safe: &mut CapabilitiesSafe, settlementCap:ID){
        
        assert!(
            vec_set::contains(&safe.settlementOperators, &settlementCap),
            error::operator_already_removed()
        );

        vec_set::remove(&mut safe.settlementOperators, &settlementCap);

        emit(SettlementOperatorRemovalEvent{
            id: settlementCap
        });

    }


    /**
     * Allows caller to set sub account (adds/removes)
     */
    entry fun set_sub_account(subAccounts: &mut SubAccounts, account: address, status: bool, ctx: &mut TxContext){

        let caller = tx_context::sender(ctx);

        let accountsMap = &mut subAccounts.map;

        // if user does not have an entry in map, create it
        if(!table::contains(accountsMap, caller)){
            table::add(accountsMap, caller, vec_set::empty());
        };

        let accountsSet = table::borrow_mut(accountsMap, caller);
        
        // if asked to whitelist sub account
        if(status){
            if(!vec_set::contains(accountsSet, &account)){
                vec_set::insert(accountsSet, account);
            };
        } else {
            // if asked to remove sub account
            if(vec_set::contains(accountsSet, &account)){
                vec_set::remove(accountsSet, &account)
            };
        };

        emit(SubAccountUpdateEvent{
            account: caller,
            subAccount: account,
            status
        });
    }

    //===========================================================//
    //                      HELPER METHODS                       //
    //===========================================================//

    fun create_exchange_admin(ctx: &mut TxContext){

        let admin = ExchangeAdminCap {
            id: object::new(ctx),
        };

        transfer::transfer(admin, tx_context::sender(ctx));

        emit(ExchangeAdminUpdateEvent{account: tx_context::sender(ctx)});
    }

    fun create_exchange_guardian(owner: address, ctx: &mut TxContext): ID{

        let id = object::new(ctx);
        let guardianID = object::uid_to_inner(&id);

        let guardian = ExchangeGuardianCap {id};

        transfer::transfer(guardian, owner);

        emit(ExchangeGuardianUpdateEvent{id: guardianID, account: owner});

        return guardianID
    }

    fun create_price_oracle_operator(owner: address, ctx: &mut TxContext): ID {

        let id = object::new(ctx);
        let pooID = object::uid_to_inner(&id);
        let operator = PriceOracleOperatorCap {id};
        
        transfer::transfer(operator, owner);
        
        emit(PriceOracleOperatorUpdate{id: pooID, account: owner});

        return pooID
    }

    fun create_deleveraging_operator(owner: address, ctx: &mut TxContext): ID {

        let id = object::new(ctx);
        let deleveragerID = object::uid_to_inner(&id);
        let operator = DeleveragingCap {id};
        
        transfer::transfer(operator, owner);
        
        emit(DelevergingOperatorUpdate{id: deleveragerID, account: owner});

        return deleveragerID

    }

    public fun check_guardian_validity(
        safe: &CapabilitiesSafe,
        cap: &ExchangeGuardianCap,
        ){ 
        assert!( 
            safe.guardian == object::uid_to_inner(&cap.id),
            error::invalid_guardian());       
    }

    public fun check_price_oracle_operator_validity(
        safe: &CapabilitiesSafe,
        cap: &PriceOracleOperatorCap
        ){ 
        
        assert!( 
            safe.priceOracleOperator == object::uid_to_inner(&cap.id),
            error::invalid_price_oracle_operator()
        ); 
    }

    public fun check_delevearging_operator_validity(
        safe: &CapabilitiesSafe,
        cap: &DeleveragingCap
        ){ 
        
        assert!( 
            safe.deleveraging == object::uid_to_inner(&cap.id),
            error::invalid_deleveraging_operator()
        ); 
    }

    /*
     * Returns true is the settlement cap is in list of whitelisted owned settlement operators
     * Note: If the settlement operator cap provided is shared (created at genesis of protocol)
     * the funciton will return false
     */
    public fun check_settlement_operator_validity(
        safe: &CapabilitiesSafe,
        cap: &SettlementCap,
        ){ 
        assert!(
            vec_set::contains(&safe.settlementOperators, &object::id(cap)),
            error::invalid_settlement_operator()
        );       
    }

    public fun check_public_settlement_cap_validity(
        safe: &CapabilitiesSafe,
        cap: &SettlementCap,
        ){ 
        assert!(
            safe.publicSettlementCap == object::uid_to_inner(&cap.id),
            error::not_a_public_settlement_cap()
        );       
    }

    public fun is_sub_account(
        subAccounts: &SubAccounts,
        account: address,
        sigMaker: address
        ): bool{ 
        
        let accountsMap = &subAccounts.map;

        // if account does not have key in table, it has no sub accounts
        if(!table::contains(accountsMap, account)){
            return false
        };

        let accountSet =  table::borrow(accountsMap, account);
        
        return vec_set::contains(accountSet, &sigMaker)
    }
    
}