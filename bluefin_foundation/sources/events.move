module bluefin_foundation::events {

    use sui::object::ID;
    use sui::event::emit;

    friend bluefin_foundation::vaults;

    // =========================================================================
    //  Events
    // =========================================================================

    struct VaultStoreAdminUpdateEvent  has copy, drop {
        vault_store: ID,
        admin: address
    }

    struct VaultBankManagerUpdateEvent has copy, drop {
        vault_store: ID,
        bank_manager: address
    }

    struct VaultBankAccountCreationEvent has copy, drop {
        vault_store: ID,
        bank_account: address
    }

    struct VaultSubAccountEvent has copy, drop {
        vault_store: ID,
        vault_bank_account: address,
        sub_account: address, 
        status: bool
    }

    // =========================================================================
    //  Events Emits
    // =========================================================================

     public(friend) fun emit_vault_store_admin_udpdate_event(
        vault_store: ID,
        admin: address
     ){
        emit(VaultStoreAdminUpdateEvent {vault_store, admin})
     }

     
    public(friend) fun emit_vault_bank_manager_udpdate_event(
        vault_store: ID,
        bank_manager: address
     ){
        emit(VaultBankManagerUpdateEvent {vault_store, bank_manager})
     }

    public(friend) fun emit_vault_bank_account_created_event(
        vault_store: ID, 
        bank_account: address
        ){
        emit(VaultBankAccountCreationEvent {vault_store, bank_account})
    }

    public(friend) fun emit_vault_sub_account_event(
        vault_store: ID,
        vault_bank_account: address,
        sub_account: address,
        status: bool
        ){
        emit(VaultSubAccountEvent {vault_store, vault_bank_account, sub_account, status})
    }


}