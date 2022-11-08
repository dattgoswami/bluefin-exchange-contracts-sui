import { JsonRpcProvider, SuiObject, SuiMoveObject, SuiExecuteTransactionResponse, OwnedObjectRef } from '@mysten/sui.js';
import { OBJECT_OWNERSHIP_STATUS } from "../src/enums";
import { ObjectMap } from "../src/interfaces";


export async function getCreatedObjects(provider: JsonRpcProvider, txResponse:SuiExecuteTransactionResponse): Promise<ObjectMap>{

    const map:ObjectMap = {};

    const createdObjects = (txResponse as any).EffectsCert.effects.effects.created as OwnedObjectRef[];

    // iterate over each object
    for(const itr in createdObjects){
        const obj = createdObjects[itr]
        // get object id
        const id = obj.reference.objectId;

        const txn = await provider.getObject(obj.reference.objectId);
        const objDetails = txn.details as SuiObject;

        // get object owner
        const owner = objDetails.owner == OBJECT_OWNERSHIP_STATUS.IMMUTABLE
         ? OBJECT_OWNERSHIP_STATUS.IMMUTABLE
            : objDetails.owner == OBJECT_OWNERSHIP_STATUS.SHARED || (objDetails.owner as any)["Shared"] != undefined
                ? OBJECT_OWNERSHIP_STATUS.SHARED
                : OBJECT_OWNERSHIP_STATUS.OWNED 

        // get object type
        const objectType = objDetails.data.dataType;

        // get data type
        let dataType = "package";
        if(objectType == 'moveObject'){
            const type = (objDetails.data as SuiMoveObject).type;
            dataType = type.slice(type.lastIndexOf("::") + 2);
        }
         
        map[dataType] = {
            id,
            owner,
            dataType,
        }
    };

    return map;    
}