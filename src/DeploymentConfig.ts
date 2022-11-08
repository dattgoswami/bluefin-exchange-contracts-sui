import { config } from "dotenv";
import { toBigNumberStr } from "./library";
config({ path: ".env" });

interface DeploymentConfig {
    rpcURL:string;
    faucetURL:string;
    deployer:string;
    filePath:string;
    markets: Perpetual[];
}

interface Perpetual {
    name:string,
    // min price at which asset can be traded
    minPrice: string,
    // max price at which asset can be traded
    maxPrice: string,
    // the smallest decimal unit supported by asset for price
    tickSize: string,
    // minimum quantity of asset that can be traded
    minQty: string,
    // maximum quantity of asset that can be traded for limit order
    maxQtyLimit: string,
    // maximum quantity of asset that can be traded for market order
    maxQtyMarket: string,
    // the smallest decimal unit supported by asset for quantity
    stepSize: string,
    //  market take bound for long side ( 10% == 100000000000000000)
    mtbLong: string,
    //  market take bound for short side ( 10% == 100000000000000000)
    mtbShort: string,
    // imr: the initial margin collateralization percentage
    initialMarginRequired: string
    // mmr: the minimum collateralization percentage
    maintenanceMarginRequired: string
    // default maker order fee for this Perpetual
    makerFee: string
    // default taker order fee for this Perpetual
    takerFee: string

}

export const DeploymentConfig:DeploymentConfig  = {
    filePath: "./deployment.json",  // Todo will create separate files for separate networks
    rpcURL: process.env.RPC_URL || "",
    faucetURL: process.env.FAUCET_URL || "",
    deployer: process.env.DEPLOYER_SEED || "",
    markets: [
        {
            name: "ETH-PERP",
            minPrice: toBigNumberStr(0.1),
            maxPrice: toBigNumberStr(100000),
            tickSize: toBigNumberStr(0.001),
            minQty: toBigNumberStr(0.01),
            maxQtyLimit: toBigNumberStr(100000),
            maxQtyMarket: toBigNumberStr(1000),
            stepSize: toBigNumberStr(0.01),
            mtbLong: toBigNumberStr(0.2),
            mtbShort: toBigNumberStr(0.2),
            initialMarginRequired: toBigNumberStr(0.475),
            maintenanceMarginRequired: toBigNumberStr(0.3),
            makerFee: toBigNumberStr(0.001),
            takerFee: toBigNumberStr(0.0045)
    }],
}


