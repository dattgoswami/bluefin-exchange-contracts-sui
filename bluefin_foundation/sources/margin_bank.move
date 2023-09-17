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
    use std::string::{Self, String};


    // custom modules
    use bluefin_foundation::library::{Self};
    use bluefin_foundation::signed_number::{Self, Number};
    use bluefin_foundation::error::{Self};
    use bluefin_foundation::roles::{Self, ExchangeGuardianCap, CapabilitiesSafe, ExchangeAdminCap};

    // friend modules
    friend bluefin_foundation::exchange;

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

    struct Bank<phantom T> has key, store {
        id: UID,
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

    public entry fun set_withdrawal_status<T>(safe: &CapabilitiesSafe, guardian: &ExchangeGuardianCap, bank: &mut Bank<T>, isWithdrawalAllowed: bool) {

        // validate guardian
        roles::check_guardian_validity(safe, guardian);

        // setting the withdrawal allowed flag
        bank.isWithdrawalAllowed = isWithdrawalAllowed;

        emit(WithdrawalStatusUpdate{status: isWithdrawalAllowed});
    }

    //===========================================================//
    //                      PUBLIC METHODS
    //===========================================================//

    /*
        Allows the ExchangeAdminCap to create the bank
        @params:
            - address of exchangeAdminCap
            - address of supported coin
    */
    public entry fun create_bank<T>(_: &ExchangeAdminCap, supportedCoin: String, ctx: &mut TxContext) {
        let empty_balance = balance::zero<T>();

        let bank = Bank {
            id: object::new(ctx),
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
    entry fun deposit_to_bank<T>(bank: &mut Bank<T>, destination: address, amount: u64, coin: &mut Coin<T>, ctx: &mut TxContext) {
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
            BankBalanceUpdate {
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
    entry fun withdraw_from_bank<T>(bank: &mut Bank<T>, destination: address, amount: u128, ctx: &mut TxContext) {
        
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
            BankBalanceUpdate {
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
     * @notice Performs a withdrawal of margin tokens from the the bank to a provided address
     */
    entry fun withdraw_all_margin_from_bank<T>(bank: &mut Bank<T>, destination: address, ctx: &mut TxContext) {
        
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
            BankBalanceUpdate {
                action: ACTION_WITHDRAW,
                srcAddress: sender,
                destAddress: destination,
                amount: amount * 1000,
                srcBalance: table::borrow(accounts, sender).balance,
                destBalance: table::borrow(accounts, destination).balance,
            }
        );

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
        bank: &mut Bank<T>,
        perpetual: address, 
        maker:address, 
        taker:address, 
        makerFundsFlow: Number, 
        takerFundsFlow: Number
        ){  
            
            // maker has no account hence no margin
            assert!(table::contains(&bank.accounts, maker), error::not_enough_balance_in_margin_bank(0));
            // taker maker has no account hence no margin
            assert!(table::contains(&bank.accounts, taker), error::not_enough_balance_in_margin_bank(1));

            if (signed_number::gte_uint(makerFundsFlow, 0)) {
                // for maker
                transfer_based_on_fundsflow(bank, perpetual, maker, makerFundsFlow, 0); 
                // for taker
                transfer_based_on_fundsflow(bank, perpetual, taker, takerFundsFlow, 1);
            } else {
                // for taker
                transfer_based_on_fundsflow(bank, perpetual, taker, takerFundsFlow, 1);
                // for maker
                transfer_based_on_fundsflow(bank, perpetual, maker, makerFundsFlow, 0);
            };
    }

    public (friend) fun transfer_margin_to_account<T>(
        bank: &mut Bank<T>, 
        source: address, 
        destination: address, 
        amount: u128, 
        offset: u64, 
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

    public (friend) fun mut_accounts<T>(bank: &mut Bank<T>): &mut Table<address, BankAccount> {
        return &mut bank.accounts
    }


    //===========================================================//
    //                      GETTER METHODS 
    //===========================================================//

    public fun get_balance<T>(bank: &Bank<T>, addr: address) : u128 {
        // getting the accounts table
        let accounts = &bank.accounts;

        // checking if the account exists
        if(!table::contains(accounts, addr)){
            // returning 0 if the account doesn't exist
            return 0u128
        };


        return table::borrow(accounts, addr).balance

    }

    public fun is_withdrawal_allowed<T>(bank: &Bank<T>) : bool {
        bank.isWithdrawalAllowed
    }

    //===========================================================//
    //                      HELPER METHODS
    //===========================================================//

    fun transfer_based_on_fundsflow<T>(
        bank: &mut Bank<T>, 
        perpetual: address, 
        account: address, 
        fundsFlow: Number, 
        isTaker: u64
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

        transfer_margin_to_account(
            bank,
            source, 
            destination, 
            signed_number::value(fundsFlow),
            offset
        );
    }





}