import { OBJECT_OWNERSHIP_STATUS } from "../enums";
import { MarketDetails } from "./market";

export interface Object {
    id: string;
    dataType: string;
}

export interface DeploymentObjects extends Object {
    owner: OBJECT_OWNERSHIP_STATUS;
}

export interface DeploymentObjectMap {
    [dataType: string]: DeploymentObjects;
}

export interface DeploymentData {
    deployer: string;
    moduleName: string;
    objects: DeploymentObjectMap;
    markets: Array<any>;
}

export interface DeploymentConfig {
    network: Network;
    deployer: string;
    filePath: string;
    markets: MarketDetails[];
}

export interface Network {
    name: string;
    rpc: string;
    faucet: string;
}
