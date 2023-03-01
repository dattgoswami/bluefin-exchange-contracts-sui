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
    use bluefin_foundation::tusdc::{TUSDC};
    use bluefin_foundation::error;

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

    //================================================================//
    //                      STRUCTS
    //================================================================//

    struct BankAdminCap has key {
        id: UID,
    }

    struct BankAccount has key, store{
        id: UID,
        balance: u128,
        owner: address,
    }

    struct Bank has key, store {
        id: UID,
        accounts: Table<address, BankAccount>,
        coinBalance: Balance<TUSDC>,
        isWithdrawalAllowed: bool,
    }

    //===========================================================//
    //                      CONSTANTS
    //===========================================================//

    // action constants
    const ACTION_DEPOSIT: u64 = 0;
    const ACTION_WITHDRAW: u64 = 1;
    const ACTION_INTERNAL: u64 = 2;


    //===========================================================//
    //                      INITIALIZATION
    //===========================================================//

    fun init(ctx: &mut TxContext) {
        // creating the admin cap
        let admin = BankAdminCap {
            id: object::new(ctx),
        };

        // transfering the admin cap with the deployer
        transfer::transfer(admin, tx_context::sender(ctx));

        let bank = Bank {
            id: object::new(ctx),
            accounts: table::new<address, BankAccount>(ctx),
            coinBalance: balance::zero<TUSDC>(),
            isWithdrawalAllowed: true,
        };

        transfer::share_object(bank);   
    }

    //===========================================================//
    //                      ADMIN METHODS
    //===========================================================//

    public entry fun set_is_withdrawal_allowed( _: &BankAdminCap, bank: &mut Bank, isWithdrawalAllowed: bool) {
        // setting the withdrawal allowed flag
        bank.isWithdrawalAllowed = isWithdrawalAllowed;
    }


    //===========================================================//
    //                      PUBLIC METHODS
    //===========================================================//

    /**
     * @notice Deposits collateral token from caller's address 
     * to provided account address in the bank
     * @dev amount is expected to be in 6 decimal units as 
     * the collateral token is USDC
     */
    public entry fun deposit_to_bank(bank: &mut Bank, destination: address, coin: Coin<TUSDC>, ctx: &mut TxContext) {
        // getting the sender address
        let sender = tx_context::sender(ctx);

        // getting the accounts table and coin balance
        let accounts = &mut bank.accounts;

        // getting the amount of the coin
        // * @dev convert 6 decimal unit amount to 9 decimals
        let amount = coin::value(&coin) * (1000 as u64);
                
        // depositing the coin to the bank
        coin::put(&mut bank.coinBalance, coin);

        // initializing the balance of the account address if it doesn't exist
        initialize_account(accounts, destination, ctx);

        // initializing the balance of the sender address if it doesn't exist
        initialize_account(accounts, sender, ctx);

        // getting the mut ref of balance of the dest account address
        let destBalance = &mut table::borrow_mut(accounts, destination).balance;

        // updating the balance
        *destBalance = (amount as u128) + *destBalance;

        // emitting the balance balance update event
        emit(
            BankBalanceUpdate {
                action: ACTION_DEPOSIT,
                srcAddress: sender,
                destAddress: destination,
                amount: (amount as u128),
                srcBalance: table::borrow(accounts, sender).balance,
                destBalance: table::borrow(accounts, destination).balance,
            }
        );
    }

    /**
     * @notice Performs a withdrawal of margin tokens from the the bank to a provided address
     */
    public entry fun withdraw_from_bank(bank: &mut Bank, destination: address, amount: u128, ctx: &mut TxContext) {
        
        // getting the sender address
        let sender = tx_context::sender(ctx);

        // checking if the withdrawal is allowed
        assert!(bank.isWithdrawalAllowed, error::withdrawal_is_not_allowed());

        // getting the accounts table and coin balance
        let accounts = &mut bank.accounts;

        // checking if the account exists
        assert!(table::contains(accounts, sender), error::not_enough_balance_in_margin_bank(3));

        // @dev convert amount to 9 decimal places
        let e9Amount = amount * (1000 as u128);

        // getting the mut ref of balance of the src_account
        let srcBalance = &mut table::borrow_mut(accounts, sender).balance;

        // checking if the sender has enough balance
        assert!(*srcBalance >= e9Amount, error::not_enough_balance_in_margin_bank(3));

        // updating the balance
        *srcBalance = *srcBalance - e9Amount;   

        // withdrawing the coin from the bank
        let coin = coin::take(&mut bank.coinBalance, (amount as u64), ctx);

        // transferring the coin to the destination account
        transfer::transfer(
            coin,
            destination
        );

        // emitting the balance balance update event
        emit(
            BankBalanceUpdate {
                action: ACTION_WITHDRAW,
                srcAddress: sender,
                destAddress: destination,
                amount: e9Amount,
                srcBalance: table::borrow(accounts, sender).balance,
                destBalance: table::borrow(accounts, destination).balance,
            }
        );

    }

    //===========================================================//
    //                      BANK OPERATOR METHODS
    //===========================================================//

    /**
     * @notice allows bank operators to transfer margin from an account to another account
     * @dev bank operators i.e. perpetual and liquidation modules move funds during a trade between accounts
     *  
     */
    public(friend) fun transfer_margin_to_account(
        bank: &mut Bank, 
        source: address, 
        destination: address, 
        amount: u128, 
        isTaker: u64, 
        ctx: &mut TxContext
        ){

        // getting the accounts table
        let accounts = &mut bank.accounts;

        // initializing the balance of the source & destination if it doesn't exist
        initialize_account(accounts, source, ctx);
        initialize_account(accounts, destination, ctx);

        // getting the mut ref of balance of the source
        let sourceBalance = &mut table::borrow_mut(accounts, source).balance;

        // checking if the sender has enough balance
        assert!(*sourceBalance >= amount, error::not_enough_balance_in_margin_bank(isTaker));

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

    //===========================================================//
    //                      GETTER METHODS 
    //===========================================================//

    public fun get_balance(bank: &Bank, addr: address) : u128 {
        // getting the accounts table
        let accounts = &bank.accounts;

        // checking if the account exists
        if(!table::contains(accounts, addr)){
            // returning 0 if the account doesn't exist
            return 0u128
        };

        // getting ref of the account
        let account = table::borrow(accounts, addr);

        // getting the ref of balance of the account
        let balance = &account.balance;

        *balance
    }

    public fun is_withdrawal_allowed(bank: &Bank) : bool {
        bank.isWithdrawalAllowed
    }

    //===========================================================//
    //                      HELPER METHODS
    //===========================================================//

    fun initialize_account(accounts: &mut Table<address, BankAccount>, addr: address, ctx: &mut TxContext){

        // checking if the account exists
        if(!table::contains(accounts, addr)){

            // initializing the account of the sender
            table::add(accounts, addr, BankAccount {
                id: object::new(ctx),
                balance: 0u128,
                owner: addr,
            });

        };
    }   

}