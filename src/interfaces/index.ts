export * from "./order";

import { OBJECT_OWNERSHIP_STATUS } from "../enums";

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

export interface wallet {
    address: string;
    phrase: string;
}

export interface UserPosition {
    isPosPositive: boolean;
    qPos: string;
    margin: string;
    mro: string;
    oiOpen: string;
}

export interface UserPositionExtended extends UserPosition {
    perpID: string;
    user: string;
}

export interface Network {
    name: string;
    rpc: string;
    faucet: string;
}
