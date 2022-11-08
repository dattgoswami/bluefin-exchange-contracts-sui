import { OBJECT_OWNERSHIP_STATUS } from "./enums"

export interface Object {
    id: string,
    owner: OBJECT_OWNERSHIP_STATUS
    dataType:string
}

export interface ObjectMap {
    [dataType: string]: Object
}

export interface wallet{
    address:string,
    phrase: string
}
