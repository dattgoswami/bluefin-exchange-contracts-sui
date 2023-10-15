module bluefin_foundation::roles {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::vec_set::{Self, VecSet};
    use sui::table::{Self, Table};
    use sui::event::{emit};
    use sui::transfer;
    use std::vector;

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

    struct DelevergingOperatorUpdate has copy, drop {
        id: ID,
        account:address
    }

    struct FundingRateOperatorUpdate has copy, drop {
        id: ID,
        account:address
    }
    
    struct SubAccountUpdateEvent has copy, drop {
            account: address,
            subAccount: address,
            status: bool
    }

    struct SequencerCreationEvent has copy, drop {
        id: ID
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

    struct SettlementCap has key {
        id: UID
    }

    struct DeleveragingCap has key {
        id: UID
    }

    struct FundingRateCap has key {
        id: UID
    }

    /// depricated, not used
    struct CapabilitiesSafe has key {
        id: UID,
        // there can only be one guardian
        guardian: ID,
        // address of deleveraging operator
        deleveraging: ID,
        // address of funding rate operator
        fundingRateOperator: ID,
        // public settlement cap, any taker can use to perform trade
        publicSettlementCap: ID,
        // there can be N different settlement operators
        settlementOperators: VecSet<ID>,
    }

    /// depricated, not used
    struct SubAccounts has key {
        id: UID,
        map:Table<address,VecSet<address>>
    }

    struct CapabilitiesSafeV2 has key {
        // Sui object id
        id: UID,
        // Track the current version of the shared object
        version: u64,
        // there can only be one guardian
        guardian: ID,
        // address of deleveraging operator
        deleveraging: ID,
        // address of funding rate operator
        fundingRateOperator: ID,
        // public settlement cap, any taker can use to perform trade
        publicSettlementCap: ID,
        // there can be N different settlement operators
        settlementOperators: VecSet<ID>,
    }

    struct SubAccountsV2 has key {
        id: UID,
        version: u64,
        map:Table<address,VecSet<address>>
    }

    struct Sequencer has key {
        id: UID,
        version: u64,
        counter: u128,
        map: Table<vector<u8>, bool>
    }

    // Track the current version of the package 
    const VERSION: u64 = 3;

    //===========================================================//
    //                      INITIALIZATION
    //===========================================================//

    fun init(ctx: &mut TxContext) {
        
        // make deployer exchange admin
        create_exchange_admin(ctx);

        // create exchange guardian 
        let guardianID = create_exchange_guardian(tx_context::sender(ctx), ctx);

        // create deleveraging operator
        let deleveragerID = create_deleveraging_operator(tx_context::sender(ctx), ctx);

        // create funding rate operator
        let frID = create_funding_rate_operator(tx_context::sender(ctx), ctx);

        // create public settlement capabity 
        // this settlement cap can be use by any taker in the world, its not 
        // added to the list of settlementOperators: VecSet<ID>
        let objID = object::new(ctx);
        let psCapID = object::uid_to_inner(&objID);  
        transfer::share_object(SettlementCap{
            id: objID
        });

        let safe = CapabilitiesSafeV2 {
            version: get_version(),
            id: object::new(ctx),
            guardian: guardianID,
            deleveraging: deleveragerID,
            fundingRateOperator: frID,
            publicSettlementCap: psCapID,
            settlementOperators: vec_set::empty(),
        };

        // share safe
        transfer::share_object(safe);

        // create sub accounts map
        let subAccounts = SubAccountsV2{id: object::new(ctx), version:get_version(), map: table::new<address, VecSet<address>>(ctx)};
        transfer::share_object(subAccounts);          

        // create sequencer
        let sequencer = Sequencer{id: object::new(ctx), version:get_version(), counter: 0, map: table::new<vector<u8>, bool>(ctx)};
        transfer::share_object(sequencer);          

    }
   
    //===========================================================//
    //                      ENTRY METHODS                        //
    //===========================================================//

    /**
     * Allows admin to make a sequencer object
     * TODO: ensure its a singleton object
     */
    entry fun create_sequencer(_: &ExchangeAdminCap, ctx: &mut TxContext){
        
        let sequencer = Sequencer {
              id:object::new(ctx),
              version: get_version(),
              counter:0,
              map: table::new<vector<u8>, bool>(ctx)
        };

        emit(SequencerCreationEvent{id: object::uid_to_inner(&sequencer.id)});

        transfer::share_object(sequencer);

    }

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
    entry fun set_exchange_guardian(_: &ExchangeAdminCap, safe: &mut CapabilitiesSafeV2, newGuardian:address, ctx: &mut TxContext){

        validate_safe_version(safe);
        // update new id in safe
        safe.guardian = create_exchange_guardian(newGuardian, ctx);
    }

    public entry fun set_deleveraging_operator(
        _:&ExchangeAdminCap, 
        _: &mut CapabilitiesSafe, 
        _: address, 
        _: &mut TxContext
        ){
    }

    /**
     * Creates deleveraing operator
     * Only exchange admin can invoke this method
     */
    public entry fun set_deleveraging_operator_v2(
        _:&ExchangeAdminCap, 
        safe: &mut CapabilitiesSafeV2, 
        newOperator: address, 
        ctx: &mut TxContext
        ){

        validate_safe_version(safe);
        // update new id address in safe
        safe.deleveraging = create_deleveraging_operator(newOperator, ctx);

    }


    public entry fun set_funding_rate_operator(
        _:&ExchangeAdminCap, 
        _safe: &mut CapabilitiesSafe, 
        _: address, 
        _: &mut TxContext
        ){

    }

    /**
     * Creates deleveraing operator
     * Only exchange admin can invoke this method
     */
    public entry fun set_funding_rate_operator_v2(
        _:&ExchangeAdminCap, 
        safe: &mut CapabilitiesSafeV2, 
        newOperator: address, 
        ctx: &mut TxContext
        ){
        
        validate_safe_version(safe);        
        // update new id address in safe
        safe.fundingRateOperator = create_funding_rate_operator(newOperator, ctx);
    }


    /**
     * Creates and transfers settlement operator capability
     * Only Admin can invoke this method
     */
    entry fun create_settlement_operator(
        _:&ExchangeAdminCap, 
        safe: &mut CapabilitiesSafeV2, 
        operator:address, 
        ctx: &mut TxContext
        ){
        
        validate_safe_version(safe);

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
    entry fun remove_settlement_operator(_: &ExchangeAdminCap, safe: &mut CapabilitiesSafeV2, settlementCap:ID){
        
        validate_safe_version(safe);

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
    entry fun set_sub_account(subAccounts: &mut SubAccountsV2, account: address, status: bool, ctx: &mut TxContext){

        validate_sub_accounts_version(subAccounts);

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

    /// Methods used to increment the version on shared objects
    /// @Dev remember to increase the version for all objects after upgrading contract

    entry fun increment_counter(_: &ExchangeAdminCap, subAccount: &mut SubAccountsV2){
        subAccount.version = subAccount.version + 1;
    }

    entry fun increment_safe_version(_: &ExchangeAdminCap, safe: &mut CapabilitiesSafeV2){
        safe.version = safe.version + 1;
    }

    entry fun increment_sequencer_version(_: &ExchangeAdminCap, sequencer: &mut Sequencer){
        sequencer.version = sequencer.version + 1;
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

    fun create_deleveraging_operator(owner: address, ctx: &mut TxContext): ID {

        let id = object::new(ctx);
        let deleveragerID = object::uid_to_inner(&id);
        let operator = DeleveragingCap {id};
        
        transfer::transfer(operator, owner);
        
        emit(DelevergingOperatorUpdate{id: deleveragerID, account: owner});

        return deleveragerID

    }


    fun create_funding_rate_operator(owner: address, ctx: &mut TxContext): ID {

        let id = object::new(ctx);
        let frID = object::uid_to_inner(&id);
        let operator = FundingRateCap {id};
        
        transfer::transfer(operator, owner);
        
        emit(FundingRateOperatorUpdate{id: frID, account: owner});

        return frID

    }

    public fun check_guardian_validity(
        safe: &CapabilitiesSafe,
        cap: &ExchangeGuardianCap,
        ){ 
        assert!( 
            safe.guardian == object::uid_to_inner(&cap.id),
            error::invalid_guardian());       
    }

    public fun check_guardian_validity_v2(
        safe: &CapabilitiesSafeV2,
        cap: &ExchangeGuardianCap,
        ){ 
        assert!( 
            safe.guardian == object::uid_to_inner(&cap.id),
            error::invalid_guardian());       
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

    public fun check_delevearging_operator_validity_v2(
        safe: &CapabilitiesSafeV2,
        cap: &DeleveragingCap
        ){ 
        
        assert!( 
            safe.deleveraging == object::uid_to_inner(&cap.id),
            error::invalid_deleveraging_operator()
        ); 
    }

    public fun check_funding_rate_operator_validity(
        safe: &CapabilitiesSafe,
        cap: &FundingRateCap
        ){ 
        
        assert!( 
            safe.fundingRateOperator == object::uid_to_inner(&cap.id),
            error::invalid_funding_rate_operator()
        ); 
    }

    public fun check_funding_rate_operator_validity_v2(
        safe: &CapabilitiesSafeV2,
        cap: &FundingRateCap
        ){ 
        
        assert!( 
            safe.fundingRateOperator == object::uid_to_inner(&cap.id),
            error::invalid_funding_rate_operator()
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

    public fun check_settlement_operator_validity_v2(
        safe: &CapabilitiesSafeV2,
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

    public fun check_public_settlement_cap_validity_v2(
        safe: &CapabilitiesSafeV2,
        cap: &SettlementCap,
        ){ 
        assert!(
            safe.publicSettlementCap == object::uid_to_inner(&cap.id),
            error::not_a_public_settlement_cap()
        );       
    }

    public fun validate_sub_accounts_version(sub_accounts: &SubAccountsV2){
        assert!(sub_accounts.version == get_version(), error::object_version_mismatch());
    }

    public fun validate_safe_version(safe: &CapabilitiesSafeV2){
        assert!(safe.version == get_version(), error::object_version_mismatch());
    }

    public fun validate_sequencer_version(sequencer: &Sequencer){
        assert!(sequencer.version == get_version(), error::object_version_mismatch());
    }

    /// validates that the transaction is unique and returns the tx counter (txIndex)
    /// to be used for events
    public fun validate_unique_tx(sequencer: &mut Sequencer, tx_hash: vector<u8>): u128{

        validate_sequencer_version(sequencer);

        assert!(!table::contains(&sequencer.map, tx_hash), error::transaction_replay());
        table::add(&mut sequencer.map, tx_hash, true);

        sequencer.counter = sequencer.counter + 1;

        return sequencer.counter
    }

    /*
     * Returns true if the provided sigMaker is sub account of the provided
     * account.
     */
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

    public fun is_sub_account_v2(
        subAccounts: &SubAccountsV2,
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

    /// Returns the version of protocol
    public fun get_version():u64{
        return VERSION
    }
    
    //===========================================================//
    //                          MIGRATION                        //
    //===========================================================//

    /// creates a V2 capabilities safe using the V1 version
    entry fun migrate_safe(_: &ExchangeAdminCap, safe: &CapabilitiesSafe, ctx: &mut TxContext) {

        let CapabilitiesSafe { 
            id:_, 
            guardian, 
            deleveraging, 
            fundingRateOperator, 
            publicSettlementCap, 
            settlementOperators } = safe;

        let safe_v2 = CapabilitiesSafeV2 {
            id: object::new(ctx),
            version: get_version(),
            guardian: *guardian,
            deleveraging: *deleveraging,
            fundingRateOperator: *fundingRateOperator,
            publicSettlementCap: *publicSettlementCap,
            settlementOperators: *settlementOperators
        };

        // share safe
        transfer::share_object(safe_v2);

    }

    /// migrates all data from V1 sub accounts map to V2 map. 
    entry fun migrate_sub_accounts(_: &ExchangeAdminCap, sub_accounts: &SubAccounts, keys:vector<address>, ctx: &mut TxContext) {

        let SubAccounts { 
             id:_,
             map} = sub_accounts;


        let sub_accounts_v2 = SubAccountsV2 {
            id: object::new(ctx),
            version: get_version(),
            map: table::new<address, VecSet<address>>(ctx)
        };

        // copy all sub accounts to new sub accounts v2
        let count = vector::length(&keys);
        let i = 0;
        while (i < count){
            let addr = *vector::borrow(&keys, i);
            table::add(&mut sub_accounts_v2.map, addr, *table::borrow(map, addr));
            i = i+1;
        };

        // share object
        transfer::share_object(sub_accounts_v2);
    }
    
}