module bluefin_foundation::guardian {
    use bluefin_foundation::roles::{CapabilitiesSafe, ExchangeGuardianCap};
    use bluefin_foundation::margin_bank::{Self, Bank};
    use bluefin_foundation::roles;
    use bluefin_foundation::perpetual::{Self, Perpetual};

    entry fun set_withdrawal_status(safe: &CapabilitiesSafe, guardian: &ExchangeGuardianCap, bank: &mut Bank, isWithdrawalAllowed: bool) {
        roles::check_guardian_validity(safe, guardian);
        margin_bank::set_withdrawal_status(bank,isWithdrawalAllowed);
    }

    entry fun set_trading_permit(safe: &CapabilitiesSafe, guardian: &ExchangeGuardianCap, perp: &mut Perpetual, isTradingPermitted: bool) {
        roles::check_guardian_validity(safe, guardian);
        perpetual::set_trading_permit(perp, isTradingPermitted);
    }
}
