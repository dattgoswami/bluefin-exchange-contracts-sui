import {
    RawSigner,
    SignerWithProvider,
    SuiExecuteTransactionResponse,
    SuiObject
} from "@mysten/sui.js";
import BigNumber from "bignumber.js";
import { DEFAULT } from "../defaults";
import { UserPosition, Order, PerpCreationMarketDetails } from "../interfaces";
import { hexToBuffer, toBigNumberStr } from "../library";
import { getAddressFromSigner, getSignerSUIAddress } from "../utils";
export class OnChainCalls {
    signer: SignerWithProvider;
    deployment: any;

    constructor(_signer: SignerWithProvider, _deployment: any) {
        this.signer = _signer;
        this.deployment = _deployment;
    }

    public async createPerpetual(
        args: PerpCreationMarketDetails,
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const callArgs = [];

        callArgs.push(args.adminID ? args.adminID : this.getAdminCap());

        callArgs.push(args.name ? args.name : "ETH-PERP");

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
        callArgs.push(args.maxAllowedFR || toBigNumberStr(0.001));

        callArgs.push(args.maxAllowedPriceDiffInOP || toBigNumberStr(1));

        callArgs.push(args.insurancePoolRatio || toBigNumberStr(0.3));

        callArgs.push(
            args.insurancePool
                ? args.insurancePool
                : DEFAULT.INSURANCE_POOL_ADDRESS
        );

        callArgs.push(args.feePool ? args.feePool : DEFAULT.FEE_POOL_ADDRESS);

        const caller = signer ? signer : this.signer;

        return this.signAndCall(caller, "create_perpetual", callArgs);
    }

    public async setMinPrice(
        args: {
            adminID?: string;
            perpID?: string;
            minPrice: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.adminID ? args.adminID : this.getAdminCap());
        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.minPrice));

        return this.signAndCall(caller, "set_min_price", callArgs);
    }

    public async setMaxPrice(
        args: {
            adminID?: string;
            perpID?: string;
            maxPrice: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.adminID ? args.adminID : this.getAdminCap());
        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.maxPrice));

        return this.signAndCall(caller, "set_max_price", callArgs);
    }

    public async setStepSize(
        args: {
            adminID?: string;
            perpID?: string;
            stepSize: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.adminID ? args.adminID : this.getAdminCap());
        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.stepSize));

        return this.signAndCall(caller, "set_step_size", callArgs);
    }

    public async setTickSize(
        args: {
            adminID?: string;
            perpID?: string;
            tickSize: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.adminID ? args.adminID : this.getAdminCap());
        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.tickSize));

        return this.signAndCall(caller, "set_tick_size", callArgs);
    }

    public async setMTBLong(
        args: {
            adminID?: string;
            perpID?: string;
            mtbLong: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.adminID ? args.adminID : this.getAdminCap());
        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.mtbLong));

        return this.signAndCall(caller, "set_mtb_long", callArgs);
    }

    public async setMTBShort(
        args: {
            adminID?: string;
            perpID?: string;
            mtbShort: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.adminID ? args.adminID : this.getAdminCap());
        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.mtbShort));

        return this.signAndCall(caller, "set_mtb_short", callArgs);
    }

    public async setMaxQtyLimit(
        args: {
            adminID?: string;
            perpID?: string;
            maxQtyLimit: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.adminID ? args.adminID : this.getAdminCap());
        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.maxQtyLimit));

        return this.signAndCall(caller, "set_max_qty_limit", callArgs);
    }

    public async setMaxQtyMarket(
        args: {
            adminID?: string;
            perpID?: string;
            maxQtyMarket: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.adminID ? args.adminID : this.getAdminCap());
        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.maxQtyMarket));

        return this.signAndCall(caller, "set_max_qty_market", callArgs);
    }

    public async setMinQty(
        args: {
            adminID?: string;
            perpID?: string;
            minQty: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.adminID ? args.adminID : this.getAdminCap());
        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.minQty));

        return this.signAndCall(caller, "set_min_qty", callArgs);
    }

    public async setMaxAllowedOIOpen(
        args: {
            adminID?: string;
            perpID?: string;
            maxLimit: string[];
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.adminID ? args.adminID : this.getAdminCap());
        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(args.maxLimit);

        return this.signAndCall(caller, "set_max_oi_open", callArgs);
    }

    public async setSettlementOperator(
        args: {
            adminID?: string;
            operator: string;
            status: boolean;
        },
        signer?: RawSigner
    ) {
        const caller = signer ? signer : this.signer;
        const callArgs = [];

        callArgs.push(args.adminID ? args.adminID : this.getAdminCap());
        callArgs.push(this.getSettlementOperatorTable());

        callArgs.push(args.operator);
        callArgs.push(args.status);

        return this.signAndCall(caller, "set_settlement_operator", callArgs);
    }

    public async trade(
        args: {
            perpID?: string;
            makerOrder: Order;
            makerSignature: string;
            takerOrder: Order;
            takerSignature: string;
            fillPrice?: BigNumber;
            fillQuantity?: BigNumber;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];
        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());

        callArgs.push(this.getOperatorTableID());
        callArgs.push(this.getOrdersTableID());

        callArgs.push(args.makerOrder.triggerPrice.toFixed(0));
        callArgs.push(args.makerOrder.isBuy);
        callArgs.push(args.makerOrder.price.toFixed(0));
        callArgs.push(args.makerOrder.quantity.toFixed(0));
        callArgs.push(args.makerOrder.leverage.toFixed(0));
        callArgs.push(args.makerOrder.reduceOnly);
        callArgs.push(args.makerOrder.maker);
        callArgs.push(args.makerOrder.expiration.toFixed(0));
        callArgs.push(args.makerOrder.salt.toFixed(0));
        callArgs.push(Array.from(hexToBuffer(args.makerSignature)));

        callArgs.push(args.takerOrder.triggerPrice.toFixed(0));
        callArgs.push(args.takerOrder.isBuy);
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

        return this.signAndCall(caller, "trade", callArgs);
    }

    public async liquidate(
        args: {
            perpID?: string;
            liquidatee: string;
            quantity: string;
            leverage: string;
            liquidator?: string;
            allOrNothing?: boolean;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];
        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());

        callArgs.push(args.liquidatee);
        callArgs.push(args.liquidator || (await getSignerSUIAddress(caller)));
        callArgs.push(args.quantity);
        callArgs.push(args.leverage);
        callArgs.push(args.allOrNothing == true);

        return this.signAndCall(caller, "liquidate", callArgs);
    }

    public async addMargin(
        args: {
            perpID?: string;
            amount: number;
        },
        signer?: RawSigner
    ) {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.amount));

        return this.signAndCall(caller, "add_margin", callArgs);
    }

    public async removeMargin(
        args: {
            perpID?: string;
            amount: number;
        },
        signer?: RawSigner
    ) {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.amount));

        return this.signAndCall(caller, "remove_margin", callArgs);
    }

    public async adjustLeverage(
        args: {
            perpID?: string;
            leverage: number;
        },
        signer?: RawSigner
    ) {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(toBigNumberStr(args.leverage));

        return this.signAndCall(caller, "adjust_leverage", callArgs);
    }

    public async updateOraclePrice(
        args: {
            perpID?: string;
            updateOPCapID?: string;
            price: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(
            args.updateOPCapID
                ? args.updateOPCapID
                : this.getUpdatePriceOracleCap()
        );
        callArgs.push(args.price);

        return this.signAndCall(caller, "set_oracle_price", callArgs);
    }

    public async updatePriceOracleOperator(
        args: {
            adminCapID?: string;
            updateOPCapID?: string;
            perpID?: string;
            operator: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.adminCapID ? args.adminCapID : this.getAdminCap());
        callArgs.push(
            args.updateOPCapID
                ? args.updateOPCapID
                : this.getUpdatePriceOracleCap()
        );
        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());

        callArgs.push(args.operator);

        return this.signAndCall(caller, "set_price_oracle_operator", callArgs);
    }

    public async updatePriceOracleMaxAllowedPriceDifference(
        args: {
            adminCapID?: string;
            perpID?: string;
            maxAllowedPriceDifference: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.adminCapID ? args.adminCapID : this.getAdminCap());
        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(args.maxAllowedPriceDifference);

        return this.signAndCall(
            caller,
            "set_oracle_price_max_allowed_diff",
            callArgs
        );
    }

    public signAndCall(
        caller: SignerWithProvider,
        method: string,
        callArgs: any[],
        moduleName?: string
    ): Promise<SuiExecuteTransactionResponse> {
        return caller.signAndExecuteTransaction({
            kind: "moveCall",
            data: {
                packageObjectId: this.getPackageID(),
                module: moduleName ? moduleName : this.getModuleName(),
                function: method,
                arguments: callArgs,
                typeArguments: [],
                gasBudget: 10000
            }
        });
    }

    public async getUSDCBalance(
        signer?: RawSigner,
        limit?: number,
        cursor?: string
    ): Promise<any> {
        const caller = signer ? signer : this.signer;

        const coins = await caller.provider.getCoins(
            await getAddressFromSigner(caller),
            this.getCurrencyID(),
            cursor ?? null,
            limit ?? null
        );

        return coins;
    }

    public async depositToBank(
        args: {
            coinID: string;
            accountAddress?: string;
            bankID?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.bankID ? args.bankID : this.getBankID());
        callArgs.push(
            args.accountAddress
                ? args.accountAddress
                : await getAddressFromSigner(caller)
        );
        callArgs.push(args.coinID);

        return this.signAndCall(caller, "deposit_to_bank", callArgs);
    }

    public async setIsWithdrawalAllowed(
        args: {
            isAllowed: boolean;
            bankID?: string;
            bankAdminCapID?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(
            args.bankAdminCapID ? args.bankAdminCapID : this.getBankAdminCapID()
        );
        callArgs.push(args.bankID ? args.bankID : this.getBankID());
        callArgs.push(args.isAllowed);

        return this.signAndCall(caller, "set_is_withdrawal_allowed", callArgs);
    }

    public async withdrawFromBank(
        args: {
            amount: string;
            accountAddress?: string;
            bankID?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.bankID ? args.bankID : this.getBankID());
        callArgs.push(
            args.accountAddress
                ? args.accountAddress
                : await getAddressFromSigner(caller)
        );
        callArgs.push(args.amount);

        return this.signAndCall(caller, "withdraw_from_bank", callArgs);
    }

    public async mintUSDC(
        args: {
            amount: string;
            to: string;
            treasuryCapID?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(
            args.treasuryCapID ? args.treasuryCapID : this.getTreasuryCapID()
        );
        callArgs.push(args.amount);
        callArgs.push(args.to);

        return this.signAndCall(caller, "mint", callArgs, "tusdc");
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

    getSettlementOperatorTable(): string {
        return this.deployment["objects"]["Table<address, bool>"].id as string;
    }

    getModuleName(): string {
        return this.deployment["moduleName"] as string;
    }

    getPackageID(): string {
        return this.deployment["objects"]["package"].id as string;
    }

    getAdminCap(): string {
        return this.deployment["objects"]["AdminCap"].id as string;
    }

    // by default returns the perpetual id of 1st market
    getPerpetualID(market: number = 0): string {
        return this.deployment["markets"][market]["Objects"]["Perpetual"]
            .id as string;
    }

    getUpdatePriceOracleCap(market: number = 0): string {
        return this.deployment["markets"][market]["Objects"][
            "UpdatePriceOracleCap"
        ].id as string;
    }
    getOperatorTableID(): string {
        return this.deployment["objects"]["Table<address, bool>"].id as string;
    }

    getOrdersTableID(): string {
        return this.deployment["objects"][
            `Table<vector<u8>, ${this.getPackageID()}::isolated_trading::OrderStatus>`
        ].id as string;
    }

    getBankID(): string {
        return this.deployment["objects"]["Bank"].id as string;
    }

    getBankAdminCapID(): string {
        return this.deployment["objects"]["BankAdminCap"].id as string;
    }

    getCurrencyID(): string {
        return this.deployment["objects"]["Currency"].id as string;
    }

    getTreasuryCapID(): string {
        return this.deployment["objects"]["TreasuryCap"].id as string;
    }
}
