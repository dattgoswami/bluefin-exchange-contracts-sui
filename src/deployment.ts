import {
    DeploymentObjectMap,
    JsonRpcProvider,
    SuiTransactionBlockResponse,
    OwnedObjectRef,
    getSuiObjectData,
    OBJECT_OWNERSHIP_STATUS,
    DeploymentData,
    RawSigner,
    MarketDetails,
    OnChainCalls,
    Transaction,
    DeploymentObjects,
    MarketDeploymentData
} from "../submodules/library-sui";

export async function getGenesisMap(
    provider: JsonRpcProvider,
    txResponse: SuiTransactionBlockResponse
): Promise<DeploymentObjectMap> {
    const map: DeploymentObjectMap = {};

    const createdObjects = (txResponse as any).effects
        .created as OwnedObjectRef[];

    // iterate over each object
    for (const itr in createdObjects) {
        const obj = createdObjects[itr];

        // get object id
        const id = obj.reference.objectId;

        let objDetails = undefined;
        while (objDetails == undefined) {
            const suiObjectResponse = await provider.getObject({
                id,
                options: { showType: true, showOwner: true, showContent: true }
            });

            objDetails = getSuiObjectData(suiObjectResponse);
        }

        // get object owner
        const owner =
            objDetails?.owner == OBJECT_OWNERSHIP_STATUS.IMMUTABLE
                ? OBJECT_OWNERSHIP_STATUS.IMMUTABLE
                : Object.keys(objDetails.owner || {}).indexOf("Shared") >= 0
                ? OBJECT_OWNERSHIP_STATUS.SHARED
                : OBJECT_OWNERSHIP_STATUS.OWNED;

        // get data type
        let dataType = "package";

        // get object type
        const objectType = objDetails?.type as string;

        if (objectType.indexOf("TreasuryCap") > 0) {
            dataType = "TreasuryCap";
        } else if (objectType.indexOf("TUSDC") > 0) {
            dataType = "Currency";
        } else if (objectType.lastIndexOf("::") > 0) {
            dataType = objectType.slice(objectType.lastIndexOf("::") + 2);
        }

        if (dataType.endsWith(">") && dataType.indexOf("<") == -1) {
            dataType = dataType.slice(0, dataType.length - 1);
        }
        map[dataType] = {
            id,
            owner,
            dataType: dataType
        };
    }

    // if the test currency was deployed, update its data type
    if (map["Currency"]) {
        map["Currency"].dataType = map["package"].id + "::tusdc::TUSDC";
    }

    return map;
}

export async function createMarket(
    deployment: DeploymentData,
    deployer: RawSigner,
    provider: JsonRpcProvider,
    priceInfoObjId: string,
    marketConfig?: MarketDetails
): Promise<DeploymentObjectMap> {
    const onChain = new OnChainCalls(deployer, deployment);
    const txResult = await onChain.createPerpetual({ ...marketConfig });
    const error = Transaction.getError(txResult);
    if (error) {
        console.error(`Error while deploying market: ${error}`);
        process.exit(1);
    }

    const map = await getGenesisMap(provider, txResult);

    // getting positions table id
    const perpDetails = await provider.getObject({
        id: map["Perpetual"]["id"],
        options: {
            showContent: true
        }
    });

    /*
    For getting oracle price we need priceInfoObjId, 
    we decided to keep the priceInfoObjId and its details in deployment.json file
    When calling from bluefin_foundation when building contracts we give priceInfoObjId
    which is than saved in deployment.json file.
    */
    const priceInfoDetails = await provider.getObject({
        id: priceInfoObjId,
        options: {
            showContent: true
        }
    });

    map["PositionsTable"] = {
        owner: OBJECT_OWNERSHIP_STATUS.SHARED,
        id: (perpDetails.data as any).content.fields.positions.fields.id.id,
        dataType: (perpDetails.data as any).content.fields.positions.type
    };

    map["PriceOracle"] = {
        owner: OBJECT_OWNERSHIP_STATUS.SHARED,
        id: priceInfoObjId,
        dataType: (priceInfoDetails.data as any).content.fields.price_info.type
    };

    return map;
}

export async function getBankTable(
    provider: JsonRpcProvider,
    objects: DeploymentObjectMap
): Promise<DeploymentObjects> {
    // get bank details
    const bankDetails = await provider.getObject({
        id: objects["Bank"]["id"],
        options: {
            showContent: true
        }
    });

    return {
        owner: OBJECT_OWNERSHIP_STATUS.SHARED,
        id: (bankDetails.data as any).content.fields.accounts.fields.id.id,
        dataType: (bankDetails.data as any).content.fields.accounts.type
    };
}

export function packDeploymentData(
    deployer: string,
    objects: DeploymentObjectMap,
    markets?: MarketDeploymentData
): DeploymentData {
    return {
        deployer,
        objects,
        markets: markets || ({} as any)
    };
}
