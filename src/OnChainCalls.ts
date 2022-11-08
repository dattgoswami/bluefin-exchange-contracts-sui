import { RawSigner, SuiExecuteTransactionResponse, getExecutionStatusError } from "@mysten/sui.js";
import { toBigNumberStr } from "./library";
import { ERROR_CODES } from "./errors";

export class OnChainCalls{
    signer: RawSigner
    deployment:any

    constructor(_signer:RawSigner, _deployment:any){
        this.signer = _signer;
        this.deployment = _deployment;
    }

    public async createPerpetual(args: {
        adminID?: string,
        name?: string,
        minPrice?: string,
        maxPrice?: string,
        tickSize?: string,
        minQty?: string,
        maxQtyLimit?: string,
        maxQtyMarket?: string,
        stepSize?: string,
        mtbLong?: string,
        mtbShort?: string  
        imr?: string,
        mmr?: string,
        makerFee?: string,
        takerFee?: string,
    }, signer?:RawSigner):Promise<SuiExecuteTransactionResponse> {

        const callArgs = [];

        callArgs.push(args.adminID ? args.adminID : this._getAdminCap());
        callArgs.push(args.name ? args.name : "ETH-PERP");

        callArgs.push(args.minPrice ? args.minPrice : toBigNumberStr(0.1));
        callArgs.push(args.maxPrice ? args.maxPrice : toBigNumberStr(100000));
        callArgs.push(args.tickSize ? args.tickSize : toBigNumberStr(0.001));
        callArgs.push(args.minQty ? args.minQty : toBigNumberStr(0.1));

        callArgs.push(args.maxQtyLimit ? args.maxQtyLimit : toBigNumberStr(100000));
        callArgs.push(args.maxQtyMarket ? args.maxQtyMarket : toBigNumberStr(1000));
        callArgs.push(args.stepSize ? args.stepSize : toBigNumberStr(0.1));
        callArgs.push(args.mtbLong ? args.mtbLong : toBigNumberStr(0.2));
        callArgs.push(args.mtbShort ? args.mtbShort : toBigNumberStr(0.2));
        
        callArgs.push(args.imr ? args.imr : toBigNumberStr(0.1));
        callArgs.push(args.mmr ? args.mmr : toBigNumberStr(0.05));

        callArgs.push(args.makerFee ? args.makerFee : toBigNumberStr(0.001));
        callArgs.push(args.takerFee ? args.takerFee : toBigNumberStr(0.0045));

    
        const caller = signer ? signer : this.signer; 
        
        return caller.executeMoveCallWithRequestType({
            packageObjectId: this._getPackageID(),
            module: this._getModuleName(),
            function: 'createPerpetual',
            typeArguments: [],
            arguments: callArgs,
            gasBudget:10000,
        });
    }

    public async setMinPrice(args: {
        adminID?: string,
        perpID?: string,
        minPrice: number,
        }, signer?:RawSigner): Promise<SuiExecuteTransactionResponse> {

        const caller = signer ? signer : this.signer; 

        const callArgs = [];

        callArgs.push(args.adminID ? args.adminID : this._getAdminCap());
        callArgs.push(args.perpID ? args.perpID : this._getPerpetual());
        callArgs.push(toBigNumberStr(args.minPrice));


        return caller.executeMoveCallWithRequestType({
            packageObjectId: this._getPackageID(),
            module: this._getModuleName(),
            function: 'setMinPrice',
            typeArguments: [],
            arguments: callArgs,
            gasBudget:10000,
        });

    }

    // ===================================== //
    //          HELPER METHODS
    // ===================================== //

    _getModuleName(): string {
        return this.deployment["moduleName"] as string
    }

    _getPackageID(): string {
        return this.deployment["objects"]["package"].id as string
    }

    _getAdminCap(): string {
        return this.deployment["objects"]['AdminCap'].id as string
    }

    // returns the perpetual id of 1st market
    _getPerpetual(): string {
        return this.deployment["markets"][0]["Objects"]["Perpetual"].id as string
    }

    _getErrorCode(tx:SuiExecuteTransactionResponse): number {
        let error = getExecutionStatusError(tx) as string;
        return Number(error.slice(error.lastIndexOf(",")+1, error.length-1))
    }

    _getError(tx:SuiExecuteTransactionResponse): string {
        const code = this._getErrorCode(tx);
        return (ERROR_CODES as any)[code];
    }
}