import {
    RawSigner,
    SignerWithProvider,
    SuiExecuteTransactionResponse,
    SuiObject
} from "@mysten/sui.js";
import BigNumber from "bignumber.js";
import { UserDetails, Order } from "../interfaces";
import { hexToBuffer, toBigNumberStr } from "../library";
export class OnChainCalls {
    signer: SignerWithProvider;
    deployment: any;

    constructor(_signer: SignerWithProvider, _deployment: any) {
        this.signer = _signer;
        this.deployment = _deployment;
    }

    public async createPerpetual(
        args: {
            adminID?: string;
            name?: string;
            minPrice?: string;
            maxPrice?: string;
            tickSize?: string;
            minQty?: string;
            maxQtyLimit?: string;
            maxQtyMarket?: string;
            stepSize?: string;
            mtbLong?: string;
            mtbShort?: string;
            maxAllowedOIOpen?: string[];
            imr?: string;
            mmr?: string;
            makerFee?: string;
            takerFee?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const callArgs = [];

        callArgs.push(args.adminID ? args.adminID : this.getAdminCap());
        callArgs.push(args.name ? args.name : "ETH-PERP");

        callArgs.push(args.minPrice ? args.minPrice : toBigNumberStr(0.1));
        callArgs.push(args.maxPrice ? args.maxPrice : toBigNumberStr(100000));
        callArgs.push(args.tickSize ? args.tickSize : toBigNumberStr(0.001));
        callArgs.push(args.minQty ? args.minQty : toBigNumberStr(0.1));

        callArgs.push(
            args.maxQtyLimit ? args.maxQtyLimit : toBigNumberStr(100000)
        );
        callArgs.push(
            args.maxQtyMarket ? args.maxQtyMarket : toBigNumberStr(1000)
        );
        callArgs.push(args.stepSize ? args.stepSize : toBigNumberStr(0.1));
        callArgs.push(args.mtbLong ? args.mtbLong : toBigNumberStr(0.2));
        callArgs.push(args.mtbShort ? args.mtbShort : toBigNumberStr(0.2));
        callArgs.push(
            args.maxAllowedOIOpen
                ? args.maxAllowedOIOpen
                : [
                      toBigNumberStr(100000),
                      toBigNumberStr(100000),
                      toBigNumberStr(200000),
                      toBigNumberStr(200000),
                      toBigNumberStr(500000)
                  ]
        );
        callArgs.push(args.imr ? args.imr : toBigNumberStr(0.1));
        callArgs.push(args.mmr ? args.mmr : toBigNumberStr(0.05));

        callArgs.push(args.makerFee ? args.makerFee : toBigNumberStr(0.001));
        callArgs.push(args.takerFee ? args.takerFee : toBigNumberStr(0.0045));

        const caller = signer ? signer : this.signer;

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "create_perpetual",
            typeArguments: [],
            arguments: callArgs,
            gasBudget: 10000
        });
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

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "setMinPrice",
            typeArguments: [],
            arguments: callArgs,
            gasBudget: 10000
        });
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

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "setMaxPrice",
            typeArguments: [],
            arguments: callArgs,
            gasBudget: 10000
        });
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

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "setStepSize",
            typeArguments: [],
            arguments: callArgs,
            gasBudget: 10000
        });
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

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "setTickSize",
            typeArguments: [],
            arguments: callArgs,
            gasBudget: 10000
        });
    }

    public async setMtbLong(
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

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "setMtbLong",
            typeArguments: [],
            arguments: callArgs,
            gasBudget: 10000
        });
    }

    public async setMtbShort(
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

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "setMtbShort",
            typeArguments: [],
            arguments: callArgs,
            gasBudget: 10000
        });
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

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "setMaxQtyLimit",
            typeArguments: [],
            arguments: callArgs,
            gasBudget: 10000
        });
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

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "setMaxQtyMarket",
            typeArguments: [],
            arguments: callArgs,
            gasBudget: 10000
        });
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

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "setMinQty",
            typeArguments: [],
            arguments: callArgs,
            gasBudget: 10000
        });
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

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "setMaxOIOpen",
            typeArguments: [],
            arguments: callArgs,
            gasBudget: 10000
        });
    }
    public async createPosition(
        args: {
            perpID?: string;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "createPosition",
            typeArguments: [],
            arguments: callArgs,
            gasBudget: 10000
        });
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

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "setSettlementOperator",
            typeArguments: [],
            arguments: callArgs,
            gasBudget: 10000
        });
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

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "trade",
            typeArguments: [],
            arguments: callArgs,
            gasBudget: 10000
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

    async getUserDetails(id: string): Promise<UserDetails> {
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

    getOperatorTableID(): string {
        return this.deployment["objects"]["Table<address, bool>"].id as string;
    }

    getOrdersTableID(): string {
        return this.deployment["objects"][
            `Table<vector<u8>, ${this.getPackageID()}::perpetual::OrderStatus>`
        ].id as string;
    }
}
