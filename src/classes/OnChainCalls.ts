import {
    RawSigner,
    SignerWithProvider,
    SuiExecuteTransactionResponse,
    SuiObject
} from "@mysten/sui.js";
import { UserDetails } from "../interfaces";
import { toBigNumberStr } from "../library";
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

        callArgs.push(args.imr ? args.imr : toBigNumberStr(0.1));
        callArgs.push(args.mmr ? args.mmr : toBigNumberStr(0.05));

        callArgs.push(args.makerFee ? args.makerFee : toBigNumberStr(0.001));
        callArgs.push(args.takerFee ? args.takerFee : toBigNumberStr(0.0045));

        const caller = signer ? signer : this.signer;

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "createPerpetual",
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

    public async updatePosition(
        args: {
            perpID?: string;
            address?: string;
            isPosPositive?: boolean;
            qPos?: number;
            margin?: number;
            oiOpen?: number;
            mro?: number;
        },
        signer?: RawSigner
    ): Promise<SuiExecuteTransactionResponse> {
        const caller = signer ? signer : this.signer;

        const callArgs = [];

        callArgs.push(args.perpID ? args.perpID : this.getPerpetualID());
        callArgs.push(
            args.address ? args.address : await this.signer.getAddress()
        );

        callArgs.push(args.isPosPositive == true);
        callArgs.push(
            args.qPos ? toBigNumberStr(args.qPos) : toBigNumberStr(1)
        );
        callArgs.push(
            args.margin ? toBigNumberStr(args.margin) : toBigNumberStr(1)
        );
        callArgs.push(
            args.oiOpen ? toBigNumberStr(args.oiOpen) : toBigNumberStr(1)
        );
        callArgs.push(args.mro ? toBigNumberStr(args.mro) : toBigNumberStr(1));

        return caller.executeMoveCallWithRequestType({
            packageObjectId: this.getPackageID(),
            module: this.getModuleName(),
            function: "mutatePosition",
            typeArguments: [],
            arguments: callArgs,
            gasBudget: 10000
        });
    }

    // public async getUserPosition(objID:string){

    // }

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
}
