import { config } from "dotenv";
import { toBigNumberStr } from "./library";
import * as Networks from "../networks.json";
import { Network, DeploymentConfig } from "./interfaces";

config({ path: ".env" });
export const market = process.env.MARKET;

export const network = {
    ...(Networks as any)[process.env.DEPLOY_ON as any],
    name: process.env.DEPLOY_ON
} as Network;

export const packageName = "bluefin_foundation";

export const DeploymentConfigs: DeploymentConfig = {
    filePath: "./deployment.json", // Todo will create separate files for separate networks
    network: network,
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
            maxAllowedOIOpen: [
                toBigNumberStr(5000000),
                toBigNumberStr(5000000),
                toBigNumberStr(2500000),
                toBigNumberStr(2500000),
                toBigNumberStr(1000000),
                toBigNumberStr(1000000),
                toBigNumberStr(250000),
                toBigNumberStr(250000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000)
            ],
            initialMarginRequired: toBigNumberStr(0.475),
            maintenanceMarginRequired: toBigNumberStr(0.3),
            makerFee: toBigNumberStr(0.001),
            takerFee: toBigNumberStr(0.0045),
            maxAllowedFR: toBigNumberStr(0.001),
            maxAllowedPriceDiffInOP: toBigNumberStr(1),
            insurancePoolRatio: toBigNumberStr(0.3),
            insurancePool: "0x95121F2aa15647bfEC8e5375615cda1CA01b7acC",
            feePool: "0x7a6809BE15F4686cfE01EcC17ee1BC711C05D36E"
        },
        {
            name: "BTC-PERP",
            minPrice: toBigNumberStr(0.1),
            maxPrice: toBigNumberStr(100000),
            tickSize: toBigNumberStr(0.001),
            minQty: toBigNumberStr(0.01),
            maxQtyLimit: toBigNumberStr(100000),
            maxQtyMarket: toBigNumberStr(1000),
            stepSize: toBigNumberStr(0.01),
            mtbLong: toBigNumberStr(0.2),
            mtbShort: toBigNumberStr(0.2),
            maxAllowedOIOpen: [
                toBigNumberStr(5000000),
                toBigNumberStr(5000000),
                toBigNumberStr(2500000),
                toBigNumberStr(2500000),
                toBigNumberStr(1000000),
                toBigNumberStr(1000000),
                toBigNumberStr(250000),
                toBigNumberStr(250000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000)
            ],
            initialMarginRequired: toBigNumberStr(0.475),
            maintenanceMarginRequired: toBigNumberStr(0.3),
            makerFee: toBigNumberStr(0.001),
            takerFee: toBigNumberStr(0.0045),
            maxAllowedFR: toBigNumberStr(0.001),
            maxAllowedPriceDiffInOP: toBigNumberStr(1),
            insurancePoolRatio: toBigNumberStr(0.3),
            insurancePool: "0x95121F2aa15647bfEC8e5375615cda1CA01b7acC",
            feePool: "0x7a6809BE15F4686cfE01EcC17ee1BC711C05D36E"
        }
    ]
};
