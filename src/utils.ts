import path from "path";

import {
    RawSigner,
    LocalTxnDataSerializer,
    Keypair,
    JsonRpcProvider,
    SuiObject,
    SuiMoveObject,
    SuiExecuteTransactionResponse,
    OwnedObjectRef,
    Base64DataBuffer,
    Secp256k1Keypair,
    SignatureScheme,
    Ed25519Keypair
} from "@mysten/sui.js";
import { OBJECT_OWNERSHIP_STATUS } from "../src/enums";
import { DeploymentObjectMap, wallet } from "../src/interfaces";
import { toBigNumber, bigNumber, ADDRESSES } from "./library";
import { Order } from "../src/interfaces";
import { config } from "dotenv";

const { execSync } = require("child_process");
const fs = require("fs");
config({ path: ".env" });

const FAUCET_URL = process.env.FAUCET_URL;

export function execCommand(command: string) {
    return execSync(command, { encoding: "utf-8" });
}

export function createWallet(): wallet {
    const phrase = execCommand("sui client new-address ed25519");
    const match = phrase.match(/(?<=\[)(.*?)(?=\])/g);
    return { address: match[1], phrase: match[2] } as wallet;
}

export function writeFile(filePath: string, jsonData: any): any {
    fs.writeFileSync(filePath, JSON.stringify(jsonData));
}

export function readFile(filePath: string): any {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : {};
}

export function getProvider(
    rpcURL: string,
    faucetURL: string
): JsonRpcProvider {
    return new JsonRpcProvider(rpcURL, { faucetURL: faucetURL });
}

export async function getSignerSUIAddress(signer: RawSigner): Promise<string> {
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
    return new RawSigner(
        keypair,
        provider,
        new LocalTxnDataSerializer(provider)
    );
}

export function getSignerFromSeed(
    seed: string,
    provider: JsonRpcProvider
): RawSigner {
    return getSignerFromKeyPair(getKeyPairFromSeed(seed), provider);
}

export async function requestGas(address: string) {
    const url = FAUCET_URL + "/gas";
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

export function mintSUI(amount: number, address: string) {}

export function getStatus(txResponse: SuiExecuteTransactionResponse) {
    return (txResponse as any)["EffectsCert"]["effects"]["effects"]["status"];
}

export async function getCreatedObjects(
    provider: JsonRpcProvider,
    txResponse: SuiExecuteTransactionResponse
): Promise<DeploymentObjectMap> {
    const map: DeploymentObjectMap = {};

    const createdObjects = (txResponse as any).EffectsCert.effects.effects
        .created as OwnedObjectRef[];

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
                : objDetails.owner == OBJECT_OWNERSHIP_STATUS.SHARED ||
                  (objDetails.owner as any)["Shared"] != undefined
                ? OBJECT_OWNERSHIP_STATUS.SHARED
                : OBJECT_OWNERSHIP_STATUS.OWNED;

        // get data type
        let dataType = "package";
        if (objectType == "moveObject") {
            const type = (objDetails.data as SuiMoveObject).type;
            dataType = type.slice(type.lastIndexOf("::") + 2);
        }

        map[dataType] = {
            id,
            owner,
            dataType
        };
    }

    return map;
}

export async function publishPackage(
    signer: RawSigner
): Promise<SuiExecuteTransactionResponse> {
    const pkgPath = path.join(process.cwd(), "/firefly_exchange");
    const compiledModules = JSON.parse(
        execCommand(
            `sui move build --dump-bytecode-as-base64 --path ${pkgPath}`
        )
    );

    const modulesInBytes = compiledModules.map((m: any) =>
        Array.from(new Base64DataBuffer(m).getData())
    );

    // publish package
    return signer.publishWithRequestType({
        compiledModules: modulesInBytes,
        gasBudget: 10000
    });
}

export function getPrivateKey(keypair: Keypair) {
    return (keypair as any).keypair.secretKey;
}

export const defaultOrder: Order = {
    price: toBigNumber(1),
    quantity: toBigNumber(1),
    leverage: toBigNumber(1),
    isBuy: true,
    reduceOnly: false,
    triggerPrice: toBigNumber(0),
    maker: ADDRESSES.ZERO,
    expiration: bigNumber(3655643731),
    salt: bigNumber(425)
};

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
        price: params.price ? toBigNumber(params.price) : defaultOrder.price,
        isBuy: params.isBuy == true,
        reduceOnly: params.reduceOnly == true,
        quantity: params.quantity
            ? toBigNumber(params.quantity)
            : defaultOrder.quantity,
        leverage: params.leverage
            ? toBigNumber(params.leverage)
            : defaultOrder.leverage,
        expiration: params.expiration
            ? bigNumber(params.expiration)
            : defaultOrder.expiration,
        salt: params.salt ? bigNumber(params.salt) : bigNumber(Date.now()),
        maker: params.makerAddress ? params.makerAddress : defaultOrder.maker
    } as Order;
}
