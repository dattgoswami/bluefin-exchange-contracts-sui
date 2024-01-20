module bluefin_foundation::margin_bank {

    //===========================================================//
    //                      IMPORTS
    //===========================================================//

    use sui::event::{emit};
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::string::{String};


    // custom modules
    use bluefin_foundation::library::{Self};
    use bluefin_foundation::signed_number::{Self, Number};
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::roles::{Self, ExchangeGuardianCap, CapabilitiesSafe, CapabilitiesSafeV2, ExchangeAdminCap, Sequencer};

    // friend modules
    friend bluefin_foundation::exchange;
    friend bluefin_foundation::perpetual;
    friend bluefin_foundation::vaults;

    //================================================================//
    //                      EVENTS
    //================================================================//

    struct BankBalanceUpdate has drop, copy {
        action: u64,
        srcAddress: address,   
        destAddress: address,   
        amount: u128,
        srcBalance: u128,
        destBalance: u128
    }

    struct BankBalanceUpdateV2 has drop, copy {
        tx_index: u128,
        action: u64,
        srcAddress: address,   
        destAddress: address,   
        amount: u128,
        srcBalance: u128,
        destBalance: u128
    }

    struct WithdrawalStatusUpdate has drop, copy {
        status: bool
    }

    //================================================================//
    //                      STRUCTS
    //================================================================//

    struct BankAccount has store{
        balance: u128,
        owner: address,
    }

    #[allow(unused_field)]
    struct Bank<phantom T> has key, store {
        id: UID,
        accounts: Table<address, BankAccount>,
        coinBalance: Balance<T>,
        isWithdrawalAllowed: bool,
        supportedCoin: String
    }

    #[allow(unused_field)]
    struct BankV2<phantom T> has key, store {
        id: UID,
        version: u64,
        accounts: Table<address, BankAccount>,
        coinBalance: Balance<T>,
        isWithdrawalAllowed: bool,
        supportedCoin: String
    }

    //===========================================================//
    //                      CONSTANTS
    //===========================================================//

    // action constants
    const ACTION_DEPOSIT: u64 = 0;
    const ACTION_WITHDRAW: u64 = 1;
    const ACTION_INTERNAL: u64 = 2;
    
    //===========================================================//
    //                      GUARDIAN METHODS
    //===========================================================//

    /// depricated
    public entry fun set_withdrawal_status<T>(_: &CapabilitiesSafe, _: &ExchangeGuardianCap, _: &mut Bank<T>, _: bool) {
    }

    public entry fun set_withdrawal_status_v2<T>(safe: &CapabilitiesSafeV2, guardian: &ExchangeGuardianCap, bank: &mut BankV2<T>, isWithdrawalAllowed: bool) {

        assert!(bank.version == roles::get_version(), error::object_version_mismatch());
        roles::validate_safe_version(safe);

        // validate guardian
        roles::check_guardian_validity_v2(safe, guardian);

        // setting the withdrawal allowed flag
        bank.isWithdrawalAllowed = isWithdrawalAllowed;

        emit(WithdrawalStatusUpdate{status: isWithdrawalAllowed});
    }

    //===========================================================//
    //                      PUBLIC METHODS
    //===========================================================//

    /*
     * Allows the ExchangeAdminCap to create the bank
     * @params:
     *  address of exchangeAdminCap
     *  address of supported coin
     */

    public entry fun create_bank<T>(_: &ExchangeAdminCap, supportedCoin: String, ctx: &mut TxContext) {
        let empty_balance = balance::zero<T>();

        let bank = BankV2 {
            id: object::new(ctx),
            version: roles::get_version(),
            accounts: table::new<address, BankAccount>(ctx),
            coinBalance: empty_balance,
            isWithdrawalAllowed: true,
            supportedCoin: supportedCoin
        };
        transfer::share_object(bank);   
    }

    /*
     * @notice Deposits collateral token from caller's address 
     * to provided account address in the bank
     * @dev amount is expected to be in 6 decimal units as 
     * the collateral token is USDC
     */
    public entry fun deposit_to_bank<T>(bank: &mut BankV2<T>, sequencer: &mut Sequencer, tx_hash: vector<u8>, destination: address, amount: u64, coin: &mut Coin<T>, ctx: &mut TxContext) {
        
        assert!(bank.version == roles::get_version(), error::object_version_mismatch());

        let tx_index = roles::validate_unique_tx(sequencer, tx_hash);

        // getting the sender address
        let sender = tx_context::sender(ctx);

        // getting the accounts table and coin balance
        let accounts = &mut bank.accounts;
                
        // initializing the balance of the account address if it doesn't exist
        initialize_account(accounts, destination);
        // initializing the balance of the sender address if it doesn't exist
        initialize_account(accounts, sender);

        // getting the amount of the coin
        let total_coin_value = coin::value(coin);

        // revert if amount > value of coin
        assert!(amount <= total_coin_value, error::coin_does_not_have_enough_amount());
                
        let coinForDeposit = coin::take(coin::balance_mut(coin), amount, ctx);

        // depositing the coin to the bank
        coin::put(&mut bank.coinBalance, coinForDeposit);

        // getting the mut ref of balance of the dest account address
        let destBalance = &mut table::borrow_mut(accounts, destination).balance;

        // convert 6 decimal unit amount to 9 decimals
        let baseAmount = library::convert_usdc_to_base_decimals((amount as u128));

        // updating the balance
        *destBalance = baseAmount + *destBalance;

        // emitting the balance balance update event
        emit(
            BankBalanceUpdateV2 {
                tx_index,
                action: ACTION_DEPOSIT,
                srcAddress: sender,
                destAddress: destination,
                amount: baseAmount,
                srcBalance: table::borrow(accounts, sender).balance,
                destBalance: table::borrow(accounts, destination).balance,
            }
        );
    
    }



    /**
     * @notice Performs a withdrawal of margin tokens from the the bank to a provided address
     * @dev withdrawal amount is expected to be in 6 decimal units as the collateral token is USDC
     */
    public entry fun withdraw_from_bank<T>(bank: &mut BankV2<T>, sequencer: &mut Sequencer, tx_hash: vector<u8>, destination: address, amount: u128, ctx: &mut TxContext) {
        
        assert!(bank.version == roles::get_version(), error::object_version_mismatch());

        let tx_index = roles::validate_unique_tx(sequencer, tx_hash);

        // getting the sender address
        let sender = tx_context::sender(ctx);

        // checking if the withdrawal is allowed
        assert!(bank.isWithdrawalAllowed, error::withdrawal_is_not_allowed());

        // getting the accounts table and coin balance
        let accounts = &mut bank.accounts;

        // checking if the account exists
        assert!(table::contains(accounts, sender), error::user_has_no_bank_account());

        // convert amount to 9 decimal places
        let baseAmount = library::convert_usdc_to_base_decimals(amount);

        // getting the mut ref of balance of the src_account
        let srcBalance = &mut table::borrow_mut(accounts, sender).balance;

        // checking if the sender has enough balance
        assert!(*srcBalance >= baseAmount, error::not_enough_balance_in_margin_bank(3));

        // updating the balance
        *srcBalance = *srcBalance - baseAmount;   

        // withdrawing the coin from the bank
        let coin = coin::take(&mut bank.coinBalance, (amount as u64), ctx);

        // transferring the coin to the destination account
        transfer::public_transfer(
            coin,
            destination
        );

        // emitting the balance balance update event
        emit(
            BankBalanceUpdateV2 {
                tx_index,
                action: ACTION_WITHDRAW,
                srcAddress: sender,
                destAddress: destination,
                amount: baseAmount,
                srcBalance: table::borrow(accounts, sender).balance,
                destBalance: table::borrow(accounts, destination).balance,
            }
        );

    }

    /**
     * @notice Performs withdrawal of coins from a vault bank account
     * and returns them
     */
    public (friend) fun withdraw_coins_from_bank_for_vault<T>(bank: &mut BankV2<T>, sequencer: &mut Sequencer, tx_hash: vector<u8>, vault:address, amount: u128, ctx: &mut TxContext): Coin<T> {
        
        assert!(bank.version == roles::get_version(), error::object_version_mismatch());

        let tx_index = roles::validate_unique_tx(sequencer, tx_hash);

        // checking if the withdrawal is allowed
        assert!(bank.isWithdrawalAllowed, error::withdrawal_is_not_allowed());

        // getting the accounts table and coin balance
        let accounts = &mut bank.accounts;

        // convert amount to 9 decimal places
        let baseAmount = library::convert_usdc_to_base_decimals(amount);

        // getting the mut ref of balance of the src_account
        let srcBalance = &mut table::borrow_mut(accounts, vault).balance;

        // checking if the sender has enough balance
        assert!(*srcBalance >= baseAmount, error::not_enough_balance_in_margin_bank(3));

        // updating the balance
        *srcBalance = *srcBalance - baseAmount;   

        // withdrawing the coin from the bank
        let coin = coin::take(&mut bank.coinBalance, (amount as u64), ctx);

        // emitting the balance balance update event
        emit(
            BankBalanceUpdateV2 {
                tx_index,
                action: ACTION_WITHDRAW,
                srcAddress: vault,
                destAddress: vault,
                amount: baseAmount,
                srcBalance: table::borrow(accounts, vault).balance,
                destBalance: table::borrow(accounts, vault).balance,
            }
        );

        return coin

    }

    /**
     * @notice Performs a withdrawal of margin tokens from the the bank to a provided address
     */
    public entry fun withdraw_all_margin_from_bank<T>(bank: &mut BankV2<T>, sequencer: &mut Sequencer, tx_hash: vector<u8>, destination: address, ctx: &mut TxContext) {
        
        assert!(bank.version == roles::get_version(), error::object_version_mismatch());

        let tx_index = roles::validate_unique_tx(sequencer, tx_hash);

        // getting the sender address
        let sender = tx_context::sender(ctx);

        // checking if the withdrawal is allowed
        assert!(bank.isWithdrawalAllowed, error::withdrawal_is_not_allowed());

        // getting the accounts table and coin balance
        let accounts = &mut bank.accounts;

        // checking if the account exists
        assert!(table::contains(accounts, sender), error::user_has_no_bank_account());

        let balance = &mut table::borrow_mut(accounts, sender).balance;

        // user has no balance? return silently
        if (*balance == 0) {
            return
        };

        // conver to 1e6 base as USDC is in 6 decimal places
        let amount = *balance / 1000; 


        // withdrawing the coin from the bank
        let coin = coin::take(&mut bank.coinBalance, (amount as u64), ctx);

        // transferring the coin to the destination account
        transfer::public_transfer(
            coin,
            destination
        );

        // updating the balance of user in margin bank
        *balance = 0;   

        // emitting the balance balance update event
        emit(
            BankBalanceUpdateV2 {
                tx_index,
                action: ACTION_WITHDRAW,
                srcAddress: sender,
                destAddress: destination,
                amount: amount * 1000,
                srcBalance: table::borrow(accounts, sender).balance,
                destBalance: table::borrow(accounts, destination).balance,
            }
        );

    }

    /// increases the version of bank object
    entry fun increment_bank_version<T>(_: &ExchangeAdminCap, bank: &mut BankV2<T>){
        bank.version = bank.version + 1;
    }

    public (friend) fun initialize_account(accounts: &mut Table<address, BankAccount>, addr: address){

        // checking if the account exists
        if(!table::contains(accounts, addr)){

            // initializing the account
            table::add(accounts, addr, BankAccount {
                balance: 0u128,
                owner: addr,
            });

        };
    }


    public (friend) fun transfer_trade_margin<T>(
        bank: &mut BankV2<T>,
        perpetual: address, 
        maker:address, 
        taker:address, 
        makerFundsFlow: Number, 
        takerFundsFlow: Number,
        tx_index: u128,
        ){  
            
            // maker has no account hence no margin
            assert!(table::contains(&bank.accounts, maker), error::not_enough_balance_in_margin_bank(0));
            // taker maker has no account hence no margin
            assert!(table::contains(&bank.accounts, taker), error::not_enough_balance_in_margin_bank(1));

            if (signed_number::gte_uint(makerFundsFlow, 0)) {
                // for maker
                transfer_based_on_fundsflow(bank, perpetual, maker, makerFundsFlow, 0, tx_index); 
                // for taker
                transfer_based_on_fundsflow(bank, perpetual, taker, takerFundsFlow, 1, tx_index);
            } else {
                // for taker
                transfer_based_on_fundsflow(bank, perpetual, taker, takerFundsFlow, 1, tx_index);
                // for maker
                transfer_based_on_fundsflow(bank, perpetual, maker, makerFundsFlow, 0, tx_index);
            };
    }

    /// depricated, only used during migration to V2 Objects
    public (friend) fun transfer_margin_to_account<T>(
        bank: &mut Bank<T>, 
        source: address, 
        destination: address, 
        amount: u128, 
        offset: u64
        ){

        // getting the accounts table
        let accounts = &mut bank.accounts;

        // getting the mut ref of balance of the source
        let sourceBalance = &mut table::borrow_mut(accounts, source).balance;

        // checking if the sender has enough balance
        assert!(*sourceBalance >= amount, error::not_enough_balance_in_margin_bank(offset));

        // reduce amount from source
        *sourceBalance = *sourceBalance - amount;

        // getting the mut ref of balance of the destination
        let destBalance = &mut table::borrow_mut(accounts, destination).balance;

        // increasing balance of desitnation
        *destBalance = *destBalance + (amount as u128);

        // emitting the balance balance update event
        emit(
            BankBalanceUpdate {
                action: ACTION_INTERNAL,
                srcAddress: source,
                destAddress: destination,
                amount: amount,
                srcBalance: table::borrow(accounts, source).balance,
                destBalance: table::borrow(accounts, destination).balance
            }
        );
    }

    public (friend) fun transfer_margin_to_account_v2<T>(
        bank: &mut BankV2<T>, 
        source: address, 
        destination: address, 
        amount: u128, 
        offset: u64,
        tx_index: u128,
        ){

        // getting the accounts table
        let accounts = &mut bank.accounts;

        // getting the mut ref of balance of the source
        let sourceBalance = &mut table::borrow_mut(accounts, source).balance;

        // checking if the sender has enough balance
        assert!(*sourceBalance >= amount, error::not_enough_balance_in_margin_bank(offset));

        // reduce amount from source
        *sourceBalance = *sourceBalance - amount;

        // getting the mut ref of balance of the destination
        let destBalance = &mut table::borrow_mut(accounts, destination).balance;

        // increasing balance of desitnation
        *destBalance = *destBalance + (amount as u128);

        // emitting the balance balance update event
        emit(
            BankBalanceUpdateV2 {
                tx_index,
                action: ACTION_INTERNAL,
                srcAddress: source,
                destAddress: destination,
                amount: amount,
                srcBalance: table::borrow(accounts, source).balance,
                destBalance: table::borrow(accounts, destination).balance
            }
        );
    }

    /// depricated
    public (friend) fun mut_accounts<T>(bank: &mut Bank<T>): &mut Table<address, BankAccount> {
        return &mut bank.accounts
    }

    public (friend) fun mut_accounts_v2<T>(bank: &mut BankV2<T>): &mut Table<address, BankAccount> {
        return &mut bank.accounts
    }
    

    //===========================================================//
    //                      GETTER METHODS 
    //===========================================================//

    /// depricated
    public fun get_balance<T>(_: &Bank<T>, _: address) : u128 {
        return 0
    }

    public fun get_balance_v2<T>(bank: &BankV2<T>, addr: address) : u128 {
        // getting the accounts table
        let accounts = &bank.accounts;

        // checking if the account exists
        if(!table::contains(accounts, addr)){
            // returning 0 if the account doesn't exist
            return 0u128
        };


        return table::borrow(accounts, addr).balance

    }

    /// depricated
    public fun is_withdrawal_allowed<T>(bank: &Bank<T>) : bool {
        return bank.isWithdrawalAllowed
    }

    public fun is_withdrawal_allowed_v2<T>(bank: &BankV2<T>) : bool {
        bank.isWithdrawalAllowed
    }

    public fun get_version<T>(bank: &BankV2<T>) : u64 {
        bank.version
    }

    

    //===========================================================//
    //                      HELPER METHODS
    //===========================================================//

    fun transfer_based_on_fundsflow<T>(
        bank: &mut BankV2<T>, 
        perpetual: address, 
        account: address, 
        fundsFlow: Number, 
        isTaker: u64,
        tx_index: u128,
        ){

        if(signed_number::value(fundsFlow) == 0){
            return
        };

        let source:address;
        let destination: address;
        let offset:u64;

        if (signed_number::gt_uint(fundsFlow, 0)){
            source = account;
            destination =  perpetual;
            offset = isTaker; // if source maker/taker does not have balance emit 600 or 601 code
        } else {
            source = perpetual;
            destination =  account;
            offset = 2;  // if perp does not have balance emit 602 code
        };

        transfer_margin_to_account_v2(
            bank,
            source, 
            destination, 
            signed_number::value(fundsFlow),
            offset,
            tx_index
        );
    }
}