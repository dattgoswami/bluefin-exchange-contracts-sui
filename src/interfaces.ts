import { OBJECT_OWNERSHIP_STATUS } from "./enums";

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

export interface UserDetails {
    isPosPositive: string;
    qPos: string;
    margin: string;
    mro: string;
    oiOpen: string;
}
