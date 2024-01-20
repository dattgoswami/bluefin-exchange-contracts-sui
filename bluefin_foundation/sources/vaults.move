module bluefin_foundation::vaults {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::vec_set::{Self, VecSet};
    use sui::coin::{Coin};
    use sui::transfer;


    use bluefin_foundation::margin_bank::{Self, BankV2};
    use bluefin_foundation::roles::{Self, SubAccountsV2, Sequencer, ExchangeAdminCap};
    use bluefin_foundation::error;
    use bluefin_foundation::events;

    /// Stores details about the vaults and elixir integration module
    struct VaultStore has key {
        id: UID,
        // the admin controlling the vaults
        admin: address, 
        // the caller that can request for withdrawl of funds from the vault
        vaults_bank_manger: address,
        // the addresses of all vaults
        vaults_bank_accounts: VecSet<address>,
        // the supported version
        version: u64
    }

    /// Only the admin of the protocol can create a vault store
    public fun create_vault_store(_: &ExchangeAdminCap, vault_admin: address, ctx: &mut TxContext){
        let store = VaultStore {
            id: object::new(ctx),
            admin: vault_admin,
            vaults_bank_manger: vault_admin,
            vaults_bank_accounts: vec_set::empty(),
            version: roles::get_version()
        };
        transfer::share_object(store);
    }

    /// Updates admin of the store
    public fun set_admin(store: &mut VaultStore, new_admin: address, ctx: &mut TxContext){
        let caller = tx_context::sender(ctx);

        // ensure that the store supports the package version
        assert!(store.version == roles::get_version(), error::object_version_mismatch());

        // caller must be the admin
        assert!(store.admin == caller, error::unauthorized());
        
        // update the store admin
        store.admin = new_admin;

        // emit event
        events::emit_vault_store_admin_udpdate_event(*object::uid_as_inner(&store.id), new_admin);

    }

    /// Sets the address of bank manager that can perform withdraw coins call for all the vaults
    /// of the provided vault store
    public fun set_vaults_bank_manger(store: &mut VaultStore, vaults_bank_manger: address, ctx: &mut TxContext){

        // ensure that the store supports the package version
        assert!(store.version == roles::get_version(), error::object_version_mismatch());

        let caller = tx_context::sender(ctx);
        // caller must be the admin
        assert!(store.admin == caller, error::unauthorized());
        
        // update the store bank manager
        store.vaults_bank_manger = vaults_bank_manger;

        // emit event
        events::emit_vault_bank_manager_udpdate_event(*object::uid_as_inner(&store.id), vaults_bank_manger);

    }

    // Elixir <> Bluefin integration module must invoke this mehtod to get the vault id
    // Creates an id for the vault from given ctx and returns it
    // Creates a bank account for the vault
    // Sets the provided account as sub account of the vault
    public fun create_vault_bank_account<USDC>(bank: &mut BankV2<USDC>, sub_accounts: &mut SubAccountsV2, store: &mut VaultStore, vault_sub_account: address, ctx: &mut TxContext): address {

        // ensure that the store supports the package version
        assert!(store.version == roles::get_version(), error::object_version_mismatch());

        let caller = tx_context::sender(ctx);

        // caller must be the admin of store
        assert!(store.admin == caller, error::unauthorized());

        let uid = object::new(ctx);
        let vault_account_address = object::uid_to_address(&uid);

        // record vault address
        vec_set::insert(&mut store.vaults_bank_accounts, vault_account_address);

        // create account in the bank
        margin_bank::initialize_account(margin_bank::mut_accounts_v2(bank), vault_account_address);

        // whitelist the sub account for trading
        roles::set_vault_sub_account(sub_accounts, vault_account_address, vault_sub_account, true);

        // emit event
        events::emit_vault_bank_account_created_event(object::uid_to_inner(&uid), vault_account_address);
        
        object::delete(uid);

        return vault_account_address

    }

    /// Allows admin fo the VaultStore to update the sub account for any of its vaults
    public fun set_vault_sub_account(sub_accounts: &mut SubAccountsV2, store: &mut VaultStore, vault:address, sub_account:address, status:bool, ctx: &mut TxContext){

        // ensure that the store supports the package version
        assert!(store.version == roles::get_version(), error::object_version_mismatch());

        let caller = tx_context::sender(ctx);

        // caller must be the admin of store
        assert!(store.admin == caller, error::unauthorized());


        // ensure that vault belongs to the store
        assert!(
            vec_set::contains(&store.vaults_bank_accounts, &vault),
            error::vault_does_not_belong_to_safe()
        ); 

        // whitelist the sub account for trading
        roles::set_vault_sub_account(sub_accounts, vault, sub_account, status);

        events::emit_vault_sub_account_event(object::uid_to_inner(&store.id), vault, sub_account, status);
    }


    /// Allows caller to withdraw requested from funds from the vault bank account
    public fun withdraw_coins_from_vault<USDC>(bank: &mut BankV2<USDC>, sequencer: &mut Sequencer, store: &VaultStore, tx_hash: vector<u8>, vault:address, amount: u128, ctx: &mut TxContext):Coin<USDC>{

        // ensure that the store supports the package version
        assert!(store.version == roles::get_version(), error::object_version_mismatch());

        let caller = tx_context::sender(ctx);

        // ensure that vault belongs to the store
        assert!(
            vec_set::contains(&store.vaults_bank_accounts, &vault),
            error::vault_does_not_belong_to_safe()
        ); 

        // caller must be the vault vaults_bank_manger
        assert!(store.vaults_bank_manger == caller, error::unauthorized());

        // perform withdraw
        return margin_bank::withdraw_coins_from_bank_for_vault(bank, sequencer, tx_hash, vault, amount, ctx)
    }


    /// allows admin of the vault to update its version
    entry fun update_vault_store_version(store: &mut VaultStore, ctx: &TxContext){
        let caller = tx_context::sender(ctx);

        // caller must be the admin of store
        assert!(store.admin == caller, error::unauthorized());

        // set the version of vault to current package version
        store.version = roles::get_version();
    }

}