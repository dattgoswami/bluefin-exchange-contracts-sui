import path from "path";

import {
    RawSigner,
    Keypair,
    JsonRpcProvider,
    SuiObject,
    SuiMoveObject,
    SuiExecuteTransactionResponse,
    OwnedObjectRef,
    Base64DataBuffer,
    Secp256k1Keypair,
    SignatureScheme,
    Ed25519Keypair,
    SignerWithProvider
} from "@mysten/sui.js";
import { OBJECT_OWNERSHIP_STATUS } from "../src/enums";
import {
    DeploymentData,
    DeploymentObjectMap,
    DeploymentObjects
} from "../src/interfaces";
import { toBigNumber, bigNumber } from "./library";
import { Order } from "../src/interfaces";
import { DEFAULT } from "./defaults";
import { config } from "dotenv";
import { Client, OnChainCalls, Transaction } from "./classes";
import { network, moduleName, packageName } from "./DeploymentConfig";
import { MarketDetails } from "./interfaces/market";

import { execSync } from "child_process";
import fs from "fs";
config({ path: ".env" });

export function execCommand(command: string) {
    return execSync(command, { encoding: "utf-8" });
}

export function writeFile(filePath: string, jsonData: any) {
    fs.writeFileSync(filePath, JSON.stringify(jsonData));
}

export function readFile(filePath: string): any {
    return fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath).toString())
        : {};
}

export function getProvider(
    rpcURL: string,
    faucetURL: string
): JsonRpcProvider {
    return new JsonRpcProvider(rpcURL, { faucetURL: faucetURL });
}

export async function getSignerSUIAddress(
    signer: RawSigner | SignerWithProvider
): Promise<string> {
    const address = await signer.getAddress();
    return `0x${address}`;
}

export function getKeyPairFromSeed(
    seed: string,
    scheme: SignatureScheme = "Secp256k1"
): Keypair {
    switch (scheme) {
        case "ED25519":
            return Ed25519Keypair.deriveKeypair(seed);
        case "Secp256k1":
            return Secp256k1Keypair.deriveKeypair("m/54'/784'/0'/0/0", seed);
        default:
            throw new Error("Provided scheme is invalid");
    }
}

export function getSignerFromKeyPair(
    keypair: Keypair,
    provider: JsonRpcProvider
): RawSigner {
    return new RawSigner(keypair, provider);
}

export function getSignerFromSeed(
    seed: string,
    provider: JsonRpcProvider
): RawSigner {
    return getSignerFromKeyPair(getKeyPairFromSeed(seed), provider);
}

export async function getAddressFromSigner(
    signer: RawSigner | SignerWithProvider
): Promise<string> {
    return `0x${await signer.getAddress()}`;
}

export async function requestGas(address: string) {
    const url = network.faucet;
    try {
        const data = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                FixedAmountRequest: {
                    recipient: address
                }
            })
        });
        return data;
    } catch (e: any) {
        console.log("Error while requesting gas", e.message);
    }
    return false;
}

export async function getCreatedObjects(
    provider: JsonRpcProvider,
    txResponse: SuiExecuteTransactionResponse
): Promise<DeploymentObjectMap> {
    const map: DeploymentObjectMap = {};

    const createdObjects = (txResponse as any).effects.created
        ? ((txResponse as any).effects.created as OwnedObjectRef[])
        : ((txResponse as any).effects.effects.created as OwnedObjectRef[]);

    // iterate over each object
    for (const itr in createdObjects) {
        const obj = createdObjects[itr];

        // get object id
        const id = obj.reference.objectId;

        const txn = await provider.getObject(obj.reference.objectId);
        const objDetails = txn.details as SuiObject;

        // get object type
        const objectType = objDetails.data.dataType;
        // get object owner
        const owner =
            objDetails.owner == OBJECT_OWNERSHIP_STATUS.IMMUTABLE
                ? OBJECT_OWNERSHIP_STATUS.IMMUTABLE
                : Object.keys(objDetails.owner).indexOf("Shared") >= 0
                ? OBJECT_OWNERSHIP_STATUS.SHARED
                : OBJECT_OWNERSHIP_STATUS.OWNED;

        // get data type
        let dataType = "package";
        if (objectType == "moveObject") {
            const type = (objDetails.data as SuiMoveObject).type;
            const tableIdx = type.lastIndexOf("Table");
            if (tableIdx >= 0) {
                dataType = type.slice(tableIdx);
            } else {
                dataType = type.slice(type.lastIndexOf("::") + 2);
            }
        }

        map[dataType] = {
            id,
            owner,
            dataType
        };
    }

    const events = (txResponse as any).effects.events
        ? ((txResponse as any).effects.events as any[])
        : [];

    for (const itr in events) {
        const obj = events[itr];

        let event: DeploymentObjects | undefined;

        if (obj["moveEvent"] !== undefined) {
            const moveEvent = obj["moveEvent"];

            const type = moveEvent["type"];

            // check if it is a coin creation event
            if (/^0x2::coin::CurrencyCreated/.test(type)) {
                const coinType =
                    /^0x2::coin::CurrencyCreated<(?<type>[\w:]+)>$/.exec(type)
                        ?.groups?.type;

                if (coinType) {
                    event = {
                        id: coinType,
                        owner: OBJECT_OWNERSHIP_STATUS.IMMUTABLE,
                        dataType: "Currency"
                    };
                }
            }
        } else if (obj["newObject"] !== undefined) {
            const newObject = obj["newObject"];

            const type = newObject["objectType"];

            // check if it is a TreasuryCap object
            if (/^0x2::coin::TreasuryCap/.test(type)) {
                event = {
                    id: newObject["objectId"],
                    owner: OBJECT_OWNERSHIP_STATUS.IMMUTABLE,
                    dataType: "TreasuryCap"
                };
            }
        }

        if (event) {
            map[event.dataType] = {
                id: event.id,
                owner: event.owner,
                dataType: event.dataType
            };
        }
    }

    return map;
}

export async function publishPackage(
    signer: RawSigner
): Promise<SuiExecuteTransactionResponse> {
    const pkgPath = path.join(process.cwd(), `/${packageName}`);
    const compiledModules = Client.buildPackage(pkgPath);

    const modulesInBytes = compiledModules.map((m: any) =>
        Array.from(new Base64DataBuffer(m).getData())
    );

    // publish package
    return signer.publish({
        compiledModules: modulesInBytes,
        gasBudget: 10000
    });
}

export async function publishPackageUsingClient(): Promise<SuiExecuteTransactionResponse> {
    const pkgPath = `"${path.join(process.cwd(), `/${packageName}`)}"`;
    return Client.publishPackage(pkgPath) as SuiExecuteTransactionResponse;
}

export async function createMarket(
    deployment: DeploymentData,
    deployer: RawSigner,
    provider: JsonRpcProvider,
    marketConfig?: MarketDetails
): Promise<DeploymentObjectMap> {
    const onChain = new OnChainCalls(deployer, deployment);
    const txResult = await onChain.createPerpetual({ ...marketConfig });
    const error = Transaction.getError(txResult);
    if (error) {
        console.error(`Error while deploying market: ${error}`);
        process.exit(1);
    }
    return await getCreatedObjects(provider, txResult);
}

export function getPrivateKey(keypair: Keypair) {
    return (keypair as any).keypair.secretKey;
}

export function getDeploymentData(
    deployer: string,
    objects: DeploymentObjectMap
): DeploymentData {
    return {
        deployer,
        objects,
        markets: [],
        moduleName
    };
}

export function createOrder(params: {
    triggerPrice?: number;
    isBuy?: boolean;
    price?: number;
    quantity?: number;
    leverage?: number;
    reduceOnly?: boolean;
    makerAddress?: string;
    expiration?: number;
    salt?: number;
}): Order {
    return {
        triggerPrice: params.triggerPrice
            ? toBigNumber(params.triggerPrice)
            : bigNumber(0),
        price: params.price ? toBigNumber(params.price) : DEFAULT.ORDER.price,
        isBuy: params.isBuy == true,
        reduceOnly: params.reduceOnly == true,
        quantity: params.quantity
            ? toBigNumber(params.quantity)
            : DEFAULT.ORDER.quantity,
        leverage: params.leverage
            ? toBigNumber(params.leverage)
            : DEFAULT.ORDER.leverage,
        expiration: params.expiration
            ? bigNumber(params.expiration)
            : DEFAULT.ORDER.expiration,
        salt: params.salt ? bigNumber(params.salt) : bigNumber(Date.now()),
        maker: params.makerAddress ? params.makerAddress : DEFAULT.ORDER.maker
    } as Order;
}

export function printOrder(order: Order) {
    console.log(
        "order.isBuy:",
        order.isBuy,
        "order.price:",
        order.price.toFixed(0),
        "order.quantity:",
        order.quantity.toFixed(0),
        "order.leverage:",
        order.leverage.toFixed(0),
        "order.reduceOnly:",
        order.reduceOnly,
        "order.triggerPrice:",
        order.triggerPrice.toFixed(0),
        "order.maker:",
        order.maker,
        "order.expiration:",
        order.expiration.toFixed(0),
        "order.salt:",
        order.salt.toFixed(0)
    );
}
