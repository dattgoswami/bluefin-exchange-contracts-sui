import {
    RawSigner,
    SignerWithProvider,
    SuiExecuteTransactionResponse,
    SuiObject
} from "@mysten/sui.js";
import BigNumber from "bignumber.js";
import { DEFAULT } from "../defaults";
import {
    UserPosition,
    Order,
    PerpCreationMarketDetails,
    BankAccountDetails
} from "../interfaces";
import {
    bigNumber,
    BigNumberable,
    hexToBuffer,
    toBigNumber,
    toBigNumberStr,
    usdcToBaseNumber
} from "../library";
import { getAddressFromSigner } from "../utils";

export class OnChainCalls {
    signer: SignerWithProvider;
    deployment: any;

    constructor(_signer: SignerWithProvider, _deployment: any) {
        this.signer = _signer;
        this.deployment = _deployment;
    }

    public async setExchangeAdmin(
        args: {
            address: string;
            adminID?: string;
        },
        signer?: RawSigner
    ) {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.address);

        return this.signAndCall(
            caller,
            "set_exchange_admin",
            callArgs,
            "roles"
        );
    }

    public async setExchangeGuardian(
        args: {
            address: string;
            adminID?: string;
            safeID?: string;
        },
        signer?: RawSigner
    ) {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(args.address);

        return this.signAndCall(
            caller,
            "set_exchange_guardian",
            callArgs,
            "roles"
        );
    }

    public async createPerpetual(
        args: PerpCreationMarketDetails,
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());

        callArgs.push(this.getBankID());

        callArgs.push(args.name || "ETH-PERP");

        callArgs.push(args.minPrice || toBigNumberStr(0.1));
        callArgs.push(args.maxPrice || toBigNumberStr(100000));
        callArgs.push(args.tickSize || toBigNumberStr(0.001));
        callArgs.push(args.minQty || toBigNumberStr(0.1));

        callArgs.push(args.maxQtyLimit || toBigNumberStr(100000));
        callArgs.push(args.maxQtyMarket || toBigNumberStr(1000));
        callArgs.push(args.stepSize || toBigNumberStr(0.1));
        callArgs.push(args.mtbLong || toBigNumberStr(0.2));
        callArgs.push(args.mtbShort || toBigNumberStr(0.2));
        callArgs.push(
            args.maxAllowedOIOpen || [
                toBigNumberStr(1_000_000), //1x
                toBigNumberStr(1_000_000), //2x
                toBigNumberStr(500_000), //3x
                toBigNumberStr(500_000), //4x
                toBigNumberStr(250_000), //5x
                toBigNumberStr(250_000), //6x
                toBigNumberStr(250_000), //7x
                toBigNumberStr(250_000), //8x
                toBigNumberStr(100_000), //9x
                toBigNumberStr(100_000) //10x
            ]
        );
        callArgs.push(args.initialMarginRequired || toBigNumberStr(0.1));
        callArgs.push(args.maintenanceMarginRequired || toBigNumberStr(0.05));

        callArgs.push(args.makerFee || toBigNumberStr(0.001));
        callArgs.push(args.takerFee || toBigNumberStr(0.0045));
        // TODO un comment when FR is implemented
        // callArgs.push(args.maxAllowedFR || toBigNumberStr(0.001));

        callArgs.push(args.maxAllowedPriceDiffInOP || toBigNumberStr(1));

        callArgs.push(args.insurancePoolRatio || toBigNumberStr(0.3));

        callArgs.push(
            args.insurancePool
                ? args.insurancePool
                : DEFAULT.INSURANCE_POOL_ADDRESS
        );

        callArgs.push(args.feePool ? args.feePool : DEFAULT.FEE_POOL_ADDRESS);

        const caller = signer || this.signer;

        return this.signAndCall(
            caller,
            "create_perpetual",
            callArgs,
            "exchange"
        );
    }

    public async setMinPrice(
        args: {
            adminID?: string;
            perpID?: string;
            minPrice: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.minPrice));

        return this.signAndCall(caller, "set_min_price", callArgs, "perpetual");
    }

    public async setMaxPrice(
        args: {
            adminID?: string;
            perpID?: string;
            maxPrice: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.maxPrice));

        return this.signAndCall(caller, "set_max_price", callArgs, "perpetual");
    }

    public async setStepSize(
        args: {
            adminID?: string;
            perpID?: string;
            stepSize: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.stepSize));

        return this.signAndCall(caller, "set_step_size", callArgs, "perpetual");
    }

    public async setTickSize(
        args: {
            adminID?: string;
            perpID?: string;
            tickSize: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.tickSize));

        return this.signAndCall(caller, "set_tick_size", callArgs, "perpetual");
    }

    public async setMTBLong(
        args: {
            adminID?: string;
            perpID?: string;
            mtbLong: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.mtbLong));

        return this.signAndCall(caller, "set_mtb_long", callArgs, "perpetual");
    }

    public async setMTBShort(
        args: {
            adminID?: string;
            perpID?: string;
            mtbShort: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.mtbShort));

        return this.signAndCall(caller, "set_mtb_short", callArgs, "perpetual");
    }

    public async setMaxQtyLimit(
        args: {
            adminID?: string;
            perpID?: string;
            maxQtyLimit: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.maxQtyLimit));

        return this.signAndCall(
            caller,
            "set_max_qty_limit",
            callArgs,
            "perpetual"
        );
    }

    public async setMaxQtyMarket(
        args: {
            adminID?: string;
            perpID?: string;
            maxQtyMarket: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.maxQtyMarket));

        return this.signAndCall(
            caller,
            "set_max_qty_market",
            callArgs,
            "perpetual"
        );
    }

    public async setMinQty(
        args: {
            adminID?: string;
            perpID?: string;
            minQty: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.minQty));

        return this.signAndCall(caller, "set_min_qty", callArgs, "perpetual");
    }

    public async setMaxAllowedOIOpen(
        args: {
            adminID?: string;
            perpID?: string;
            maxLimit: string[];
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(args.maxLimit);

        return this.signAndCall(
            caller,
            "set_max_oi_open",
            callArgs,
            "perpetual"
        );
    }

    public async createSettlementOperator(
        args: {
            operator: string;
            adminID?: string;
            safeID?: string;
        },
        signer?: RawSigner
    ) {
        const caller = signer || this.signer;
        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(args.operator);

        return this.signAndCall(
            caller,
            "create_settlement_operator",
            callArgs,
            "roles"
        );
    }

    public async removeSettlementOperator(
        args: {
            capID: string;
            adminID?: string;
            safeID?: string;
        },
        signer?: RawSigner
    ) {
        const caller = signer || this.signer;
        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(args.capID);

        return this.signAndCall(
            caller,
            "remove_settlement_operator",
            callArgs,
            "roles"
        );
    }

    public async setFeePoolAddress(
        args: {
            adminID?: string;
            perpID?: string;
            address: string;
        },
        signer?: RawSigner
    ) {
        const caller = signer || this.signer;
        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(args.address);

        return this.signAndCall(
            caller,
            "set_fee_pool_address",
            callArgs,
            "perpetual"
        );
    }

    public async setInsurancePoolAddress(
        args: {
            adminID?: string;
            perpID?: string;
            address: string;
        },
        signer?: RawSigner
    ) {
        const caller = signer || this.signer;
        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(args.address);

        return this.signAndCall(
            caller,
            "set_insurance_pool_address",
            callArgs,
            "perpetual"
        );
    }

    public async setInsurancePoolPercentage(
        args: {
            adminID?: string;
            perpID?: string;
            percentage: number;
        },
        signer?: RawSigner
    ) {
        const caller = signer || this.signer;
        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.percentage));

        return this.signAndCall(
            caller,
            "set_insurance_pool_percentage",
            callArgs,
            "perpetual"
        );
    }

    public async setMaxAllowedFundingRate(
        args: {
            adminID?: string;
            perpID?: string;
            maxAllowedFR: number;
        },
        signer?: RawSigner
    ) {
        // TODO, the method has been removed from exchange
        // remove it
        const caller = signer || this.signer;
        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.maxAllowedFR));

        return this.signAndCall(
            caller,
            "set_max_allowed_funding_rate",
            callArgs,
            "perpetual"
        );
    }

    public async trade(
        args: {
            settlementCapID: string;
            makerOrder: Order;
            makerSignature: string;
            takerOrder: Order;
            takerSignature: string;
            fillPrice?: BigNumber;
            fillQuantity?: BigNumber;
            perpID?: string;
            safeID?: string;
            bankID?: string;
            subAccountsMapID?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(args.bankID || this.getBankID());
        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(args.settlementCapID);

        callArgs.push(args.subAccountsMapID || this.getSubAccountsID());
        callArgs.push(this.getOrdersTableID());

        callArgs.push(args.makerOrder.isBuy);
        callArgs.push(args.makerOrder.postOnly);
        callArgs.push(args.makerOrder.price.toFixed(0));
        callArgs.push(args.makerOrder.quantity.toFixed(0));
        callArgs.push(args.makerOrder.leverage.toFixed(0));
        callArgs.push(args.makerOrder.reduceOnly);
        callArgs.push(args.makerOrder.maker);
        callArgs.push(args.makerOrder.expiration.toFixed(0));
        callArgs.push(args.makerOrder.salt.toFixed(0));
        callArgs.push(Array.from(hexToBuffer(args.makerSignature)));

        callArgs.push(args.takerOrder.isBuy);
        callArgs.push(args.takerOrder.postOnly);
        callArgs.push(args.takerOrder.price.toFixed(0));
        callArgs.push(args.takerOrder.quantity.toFixed(0));
        callArgs.push(args.takerOrder.leverage.toFixed(0));
        callArgs.push(args.takerOrder.reduceOnly);
        callArgs.push(args.takerOrder.maker);
        callArgs.push(args.takerOrder.expiration.toFixed(0));
        callArgs.push(args.takerOrder.salt.toFixed(0));
        callArgs.push(Array.from(hexToBuffer(args.takerSignature)));

        callArgs.push(
            args.fillQuantity
                ? args.fillQuantity.toFixed(0)
                : args.makerOrder.quantity.lte(args.takerOrder.quantity)
                ? args.makerOrder.quantity.toFixed(0)
                : args.takerOrder.quantity.toFixed(0)
        );

        callArgs.push(
            args.fillPrice
                ? args.fillPrice.toFixed(0)
                : args.makerOrder.price.toFixed(0)
        );

        return this.signAndCall(caller, "trade", callArgs, "exchange");
    }

    public async liquidate(
        args: {
            perpID?: string;
            liquidatee: string;
            quantity: string;
            leverage: string;
            liquidator?: string;
            allOrNothing?: boolean;
            subAccountsMapID?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(this.getBankID());
        callArgs.push(args.subAccountsMapID || this.getSubAccountsID());

        callArgs.push(args.liquidatee);
        callArgs.push(args.liquidator || (await getAddressFromSigner(caller)));
        callArgs.push(args.quantity);
        callArgs.push(args.leverage);
        callArgs.push(args.allOrNothing == true);

        return this.signAndCall(caller, "liquidate", callArgs, "exchange");
    }

    public async deleverage(
        args: {
            maker: string;
            taker: string;
            quantity: string;
            allOrNothing?: boolean;
            perpID?: string;
            deleveragingCapID?: string;
            safeID?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(this.getBankID());
        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(args.deleveragingCapID || this.getDeleveragingCapID());

        callArgs.push(args.maker);
        callArgs.push(args.taker);
        callArgs.push(args.quantity);
        callArgs.push(args.allOrNothing == true);

        return this.signAndCall(caller, "deleverage", callArgs, "exchange");
    }

    public async addMargin(
        args: {
            amount: number;
            account?: string;
            perpID?: string;
            subAccountsMapID?: string;
        },
        signer?: RawSigner
    ) {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(this.getBankID());

        callArgs.push(args.subAccountsMapID || this.getSubAccountsID());
        callArgs.push(args.account || (await getAddressFromSigner(caller)));
        callArgs.push(toBigNumberStr(args.amount));

        return this.signAndCall(caller, "add_margin", callArgs, "exchange");
    }

    public async removeMargin(
        args: {
            amount: number;
            account?: string;
            perpID?: string;
            subAccountsMapID?: string;
        },
        signer?: RawSigner
    ) {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(this.getBankID());
        callArgs.push(args.subAccountsMapID || this.getSubAccountsID());
        callArgs.push(args.account || (await getAddressFromSigner(caller)));
        callArgs.push(toBigNumberStr(args.amount));

        return this.signAndCall(caller, "remove_margin", callArgs, "exchange");
    }

    public async adjustLeverage(
        args: {
            leverage: number;
            account?: string;
            perpID?: string;
            subAccountsMapID?: string;
        },
        signer?: RawSigner
    ) {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(this.getBankID());
        callArgs.push(args.subAccountsMapID || this.getSubAccountsID());
        callArgs.push(args.account || (await getAddressFromSigner(caller)));
        callArgs.push(toBigNumberStr(args.leverage));

        return this.signAndCall(
            caller,
            "adjust_leverage",
            callArgs,
            "exchange"
        );
    }

    public async updateOraclePrice(
        args: {
            price: string;
            safeID?: string;
            updateOPCapID?: string;
            perpID?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(args.updateOPCapID || this.getPriceOracleOperatorCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(args.price);

        return this.signAndCall(
            caller,
            "set_oracle_price",
            callArgs,
            "perpetual"
        );
    }

    public async setPriceOracleOperator(
        args: {
            operator: string;
            adminID?: string;
            safeID?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.safeID || this.getSafeID());

        callArgs.push(args.operator);

        return this.signAndCall(
            caller,
            "set_price_oracle_operator",
            callArgs,
            "roles"
        );
    }

    public async setDeleveragingOperator(
        args: {
            operator: string;
            adminID?: string;
            safeID?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.safeID || this.getSafeID());

        callArgs.push(args.operator);

        return this.signAndCall(
            caller,
            "set_deleveraging_operator",
            callArgs,
            "roles"
        );
    }

    public async setSubAccount(
        args: {
            account: string;
            status: boolean;
            subAccountsMapID?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.subAccountsMapID || this.getSubAccountsID());
        callArgs.push(args.account);
        callArgs.push(args.status);

        return this.signAndCall(caller, "set_sub_account", callArgs, "roles");
    }

    public async updatePriceOracleMaxAllowedPriceDifference(
        args: {
            adminID?: string;
            perpID?: string;
            maxAllowedPriceDifference: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(args.maxAllowedPriceDifference);

        return this.signAndCall(
            caller,
            "set_oracle_price_max_allowed_diff",
            callArgs,
            "perpetual"
        );
    }

    public async depositToBank(
        args: {
            coinID: string;
            amount: string;
            accountAddress?: string;
            bankID?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.bankID ? args.bankID : this.getBankID());
        callArgs.push(
            args.accountAddress
                ? args.accountAddress
                : await getAddressFromSigner(caller)
        );
        callArgs.push(args.amount);
        callArgs.push(args.coinID);

        return this.signAndCall(
            caller,
            "deposit_to_bank",
            callArgs,
            "margin_bank"
        );
    }

    public async setBankWithdrawalStatus(
        args: {
            isAllowed: boolean;
            bankID?: string;
            safeID?: string;
            guardianCap?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(args.guardianCap || this.getGuardianCap());
        callArgs.push(args.bankID || this.getBankID());
        callArgs.push(args.isAllowed);

        return this.signAndCall(
            caller,
            "set_withdrawal_status",
            callArgs,
            "margin_bank"
        );
    }

    public async setPerpetualTradingPermit(
        args: {
            isPermitted: boolean;
            perpID?: string;
            safeID?: string;
            guardianCap?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(args.guardianCap || this.getGuardianCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(args.isPermitted);

        return this.signAndCall(
            caller,
            "set_trading_permit",
            callArgs,
            "perpetual"
        );
    }

    public async withdrawFromBank(
        args: {
            amount: string;
            accountAddress?: string;
            bankID?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.bankID ? args.bankID : this.getBankID());
        callArgs.push(
            args.accountAddress
                ? args.accountAddress
                : await getAddressFromSigner(caller)
        );
        callArgs.push(args.amount);

        return this.signAndCall(
            caller,
            "withdraw_from_bank",
            callArgs,
            "margin_bank"
        );
    }

    public async withdrawAllMarginFromBank(
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(this.getBankID());
        callArgs.push(await getAddressFromSigner(caller));

        return this.signAndCall(
            caller,
            "withdraw_all_margin_from_bank",
            callArgs,
            "margin_bank"
        );
    }

    public async delistPerpetual(
        args: {
            price: string;
            perpID?: string;
            adminID?: string;
        },
        signer?: RawSigner
    ) {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.perpID || this.getPerpetualID());
        callArgs.push(args.price);

        return this.signAndCall(
            caller,
            "delist_perpetual",
            callArgs,
            "perpetual"
        );
    }

    public async closePosition(
        args?: {
            bankID?: string;
            perpID?: string;
        },
        signer?: RawSigner
    ) {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args?.perpID || this.getPerpetualID());
        callArgs.push(args?.bankID || this.getBankID());

        return this.signAndCall(caller, "close_position", callArgs, "exchange");
    }

    public async mintUSDC(
        args: {
            amount: string;
            to?: string;
            treasuryCapID?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.treasuryCapID || this.getTreasuryCapID());

        callArgs.push(args.amount);

        callArgs.push(args?.to || (await getAddressFromSigner(caller)));

        return this.signAndCall(caller, "mint", callArgs, "tusdc");
    }

    public async getUSDCCoins(
        args?: {
            address?: string;
            currencyID?: string;
            limit?: number;
            cursor?: string;
        },
        signer?: RawSigner
    ): Promise<any> {
        const caller = signer || this.signer;

        const coins = await caller.provider.getCoins(
            args?.address || (await getAddressFromSigner(caller)),
            args?.currencyID || this.getCurrencyID(),
            args?.cursor ?? null,
            args?.limit ?? null
        );

        return coins;
    }

    public async getUSDCBalance(
        args?: {
            address?: string;
            currencyID?: string;
            limit?: number;
            cursor?: string;
        },
        signer?: RawSigner
    ): Promise<number> {
        const coins = await this.getUSDCCoins(args, signer);
        if (coins.data.length == 0) {
            return 0;
        } else {
            const bal = coins.data.reduce(
                (total: number, coin: any) => total + coin.balance,
                0
            );
            return usdcToBaseNumber(bal);
        }
    }

    public async getUSDCoinHavingBalance(
        args: {
            amount: BigNumberable;
            address?: string;
            currencyID?: string;
            limit?: number;
            cursor?: string;
        },
        signer?: RawSigner
    ) {
        // get all usdc coins
        const coins = await this.getUSDCCoins(args, signer);

        for (const coin of coins.data) {
            if (bigNumber(coin.balance).gte(toBigNumber(args.amount, 6))) {
                return coin;
            }
        }
        return undefined;
    }

    public async getBankAccountDetails(
        id: string
    ): Promise<BankAccountDetails> {
        const obj = await this.getOnChainObject(id);
        if (obj) {
            return this._parseAccountDetails(obj);
        } else {
            throw `No object found with id: ${id}`;
        }
    }

    public async getBankAccountDetailsUsingAddress(
        address: string
    ): Promise<BigNumber> {
        if (this.deployment.bankAccounts[address] === undefined)
            throw `Address: ${address} not found in deployment map`;

        const id = this.deployment.bankAccounts[address];

        const obj = await this.getOnChainObject(id);

        if (obj) {
            return this._parseAccountDetails(obj).balance;
        } else {
            throw `No object found with id: ${id}`;
        }
    }

    public signAndCall(
        caller: SignerWithProvider,
        method: string,
        callArgs: any[],
        moduleName: string
    ): Promise<SuiExecuteTransactionResponse> {
        return caller.signAndExecuteTransaction({
            kind: "moveCall",
            data: {
                packageObjectId: this.getPackageID(),
                module: moduleName,
                function: method,
                arguments: callArgs,
                typeArguments: [],
                gasBudget: 10000
            }
        });
    }

    // ===================================== //
    //          GETTER METHODS
    // ===================================== //

    async getOnChainObject(id: string): Promise<SuiObject> {
        const objDetails = (await this.signer.provider.getObject(id))
            .details as SuiObject;
        return objDetails;
    }

    async getUserPosition(id: string): Promise<UserPosition> {
        const details = await this.getOnChainObject(id);
        return (details.data as any).fields.value.fields;
    }

    async getPerpDetails(id: string): Promise<any> {
        const details = await this.getOnChainObject(id);
        return (details.data as any).fields;
    }

    getBankID(): string {
        return this.deployment["objects"]["Bank"].id as string;
    }

    getSafeID(): string {
        return this.deployment["objects"]["CapabilitiesSafe"].id as string;
    }

    getGuardianCap(): string {
        return this.deployment["objects"]["ExchangeGuardianCap"].id as string;
    }

    getDeleveragingCapID(): string {
        return this.deployment["objects"]["DeleveragingCap"].id as string;
    }

    getSettlementOperatorTable(): string {
        return this.deployment["objects"]["Table<address, bool>"].id as string;
    }

    getPackageID(): string {
        return this.deployment["objects"]["package"].id as string;
    }

    getExchangeAdminCap(): string {
        return this.deployment["objects"]["ExchangeAdminCap"].id as string;
    }

    getSubAccountsID(): string {
        return this.deployment["objects"]["SubAccounts"].id as string;
    }

    getPriceOracleOperatorCap(): string {
        return this.deployment["objects"]["PriceOracleOperatorCap"]
            .id as string;
    }

    // by default returns the perpetual id of 1st market
    getPerpetualID(market = "ETH-PERP"): string {
        return this.deployment["markets"][market]["Objects"]["Perpetual"]
            .id as string;
    }

    getOrdersTableID(): string {
        return this.deployment["objects"][
            `Table<vector<u8>, ${this.getPackageID()}::isolated_trading::OrderStatus>`
        ].id as string;
    }

    getDeployerAddress(): string {
        return this.deployment["deployer"] as string;
    }

    getCurrencyID(): string {
        return this.deployment["objects"]["Currency"].id as string;
    }

    getTreasuryCapID(): string {
        return this.deployment["objects"]["TreasuryCap"].id as string;
    }

    // ===================================== //
    //          HELPER METHODS
    // ===================================== //

    _parseAccountDetails(obj: any): BankAccountDetails {
        return {
            address: obj.data.fields.name,
            balance: bigNumber(obj.data.fields.value.fields.balance)
        } as BankAccountDetails;
    }
}
