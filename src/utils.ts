import path from "path";

import {
    RawSigner,
    Keypair,
    JsonRpcProvider,
    getSuiObjectData,
    SuiTransactionBlockResponse,
    OwnedObjectRef,
    Secp256k1Keypair,
    SignatureScheme,
    Ed25519Keypair,
    SignerWithProvider,
    Connection
} from "@mysten/sui.js";
import { OBJECT_OWNERSHIP_STATUS } from "../src/enums";
import {
    BankAccountMap,
    DeploymentData,
    DeploymentObjectMap,
    MarketDeployment,
    MarketDeploymentData
} from "../src/interfaces";
import { toBigNumber, bigNumber } from "./library";
import { Order } from "../src/interfaces";
import { DEFAULT } from "./defaults";
import { config } from "dotenv";
import { Client, OnChainCalls, Transaction } from "./classes";
import { network, packageName } from "./DeploymentConfig";
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
    return new JsonRpcProvider(
        new Connection({ fullnode: rpcURL, faucet: faucetURL })
    );
}

export function getKeyPairFromSeed(
    seed: string,
    scheme: SignatureScheme = "Secp256k1"
): Keypair {
    switch (scheme) {
        case "ED25519":
            return Ed25519Keypair.deriveKeypair(seed);
        case "Secp256k1":
            return Secp256k1Keypair.deriveKeypair(seed);
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

        const suiObjectResponse = await provider.getObject({
            id: obj.reference.objectId,
            options: { showType: true, showOwner: true, showContent: true }
        });

        const objDetails = getSuiObjectData(suiObjectResponse);

        // get object type
        const objectType = objDetails?.type as string;
        // get object owner
        const owner =
            objDetails?.owner == OBJECT_OWNERSHIP_STATUS.IMMUTABLE
                ? OBJECT_OWNERSHIP_STATUS.IMMUTABLE
                : Object.keys(objDetails?.owner as any).indexOf("Shared") >= 0
                ? OBJECT_OWNERSHIP_STATUS.SHARED
                : OBJECT_OWNERSHIP_STATUS.OWNED;

        // get data type
        let dataType = "package";

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

export async function publishPackage(
    usingCLI: boolean = false,
    deployer: RawSigner | undefined = undefined
): Promise<SuiTransactionBlockResponse> {
    const pkgPath = `"${path.join(process.cwd(), `/${packageName}`)}"`;
    if (usingCLI) {
        return Client.publishPackage(pkgPath);
    } else {
        return Client.publishPackageUsingSDK(deployer as RawSigner, pkgPath);
    }
}

export async function createMarket(
    deployment: DeploymentData,
    deployer: RawSigner,
    provider: JsonRpcProvider,
    marketConfig?: MarketDetails
): Promise<MarketDeployment> {
    const onChain = new OnChainCalls(deployer, deployment);
    const txResult = await onChain.createPerpetual({ ...marketConfig });
    const error = Transaction.getError(txResult);
    if (error) {
        console.error(`Error while deploying market: ${error}`);
        process.exit(1);
    }

    const map = await getGenesisMap(provider, txResult);

    // get account details for insurance pool, perpetual and fee pool
    const bankAccounts: BankAccountMap = {};
    const createdObjects = Transaction.getCreatedObjectIDs(txResult);

    for (const id of createdObjects) {
        const acctDetails = await onChain.getBankAccountDetails(id);
        if (acctDetails != undefined) {
            bankAccounts[acctDetails.address] = id;
        }
    }

    return {
        marketObjects: map,
        bankAccounts: bankAccounts
    };
}

export function getPrivateKey(keypair: Keypair) {
    return (keypair as any).keypair.secretKey;
}

export function getDeploymentData(
    deployer: string,
    objects: DeploymentObjectMap,
    markets?: MarketDeploymentData,
    bankAccounts?: BankAccountMap
): DeploymentData {
    return {
        deployer,
        objects,
        markets: markets || ({} as any),
        bankAccounts: bankAccounts || {}
    };
}

export function createOrder(params?: {
    market?: string;
    maker?: string;
    isBuy?: boolean;
    price?: number;
    quantity?: number;
    leverage?: number;
    reduceOnly?: boolean;
    postOnly?: boolean;
    ioc?: boolean;
    orderbookOnly?: boolean;
    expiration?: number;
    salt?: number;
}): Order {
    return {
        market: params?.market || DEFAULT.ORDER.market,
        maker: params?.maker || DEFAULT.ORDER.maker,
        isBuy: params?.isBuy == true,
        reduceOnly: params?.reduceOnly == true,
        postOnly: params?.postOnly == true,
        orderbookOnly:
            params?.orderbookOnly == undefined ? true : params.orderbookOnly,
        ioc: params?.ioc == true,
        price: params?.price ? toBigNumber(params.price) : DEFAULT.ORDER.price,
        quantity: params?.quantity
            ? toBigNumber(params.quantity)
            : DEFAULT.ORDER.quantity,
        leverage: params?.leverage
            ? toBigNumber(params?.leverage)
            : DEFAULT.ORDER.leverage,
        expiration: params?.expiration
            ? bigNumber(params?.expiration)
            : DEFAULT.ORDER.expiration,
        salt: params?.salt ? bigNumber(params?.salt) : bigNumber(Date.now())
    } as Order;
}

export function printOrder(order: Order) {
    console.log(
        "\norder.maker:",
        order.maker,
        "\norder.market:",
        order.market,
        "\norder.isBuy:",
        order.isBuy,
        "\norder.reduceOnly:",
        order.reduceOnly,
        "\norder.postOnly:",
        order.postOnly,
        "\norder.orderbookOnly:",
        order.orderbookOnly,
        "\norder.ioc:",
        order.ioc,
        "\norder.price:",
        order.price.toFixed(0),
        "\norder.quantity:",
        order.quantity.toFixed(0),
        "\norder.leverage:",
        order.leverage.toFixed(0),
        "\norder.expiration:",
        order.expiration.toFixed(0),
        "\norder.salt:",
        order.salt.toFixed(0)
    );
}
