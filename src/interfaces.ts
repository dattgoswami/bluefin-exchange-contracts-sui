import { OBJECT_OWNERSHIP_STATUS } from "./enums"
import { ObjectType } from "@mysten/sui.js";

export interface Object {
    id: string,
    owner: OBJECT_OWNERSHIP_STATUS
    dataType:string
}

export interface ObjectMap {
    [dataType: string]: Object
}