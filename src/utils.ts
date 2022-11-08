import path from "path";

import { 
    RawSigner, 
    Ed25519Keypair, 
    LocalTxnDataSerializer, 
    Keypair, 
    JsonRpcProvider, 
    SuiObject, 
    SuiMoveObject, 
    SuiExecuteTransactionResponse, 
    OwnedObjectRef,
    Base64DataBuffer
} from '@mysten/sui.js';
import { OBJECT_OWNERSHIP_STATUS } from "../src/enums";
import { ObjectMap, wallet } from "../src/interfaces";
import { config } from "dotenv";

const { execSync } = require('child_process');
const fs = require("fs");
config({ path: ".env" });

const FAUCET_URL = process.env.FAUCET_URL;


export function execCommand(command:string){
    return execSync(command, { encoding: 'utf-8' })
}

export function createWallet(): wallet{
    const phrase = execCommand('sui client new-address ed25519');
    const match = phrase.match(/(?<=\[)(.*?)(?=\])/g);
    return {address: match[1], phrase: match[2]} as wallet;
}


export function writeFile(filePath: string, jsonData: any): any {
    fs.writeFileSync(filePath, JSON.stringify(jsonData));
}

export function readFile(filePath: string): any {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : {};
}

export function getProvider(rpcURL: string, faucetURL:string): JsonRpcProvider {
    return new JsonRpcProvider(rpcURL, {faucetURL: faucetURL} );
}

export async function getSignerSUIAddress(signer:RawSigner): Promise<string> {
    const address = await signer.getAddress();
    return `0x${address}`

}


export function getKeyPairFromSeed(seed:string):Keypair {
    return Ed25519Keypair.deriveKeypair(seed);
}

export function getSignerFromKeyPair(keypair: Keypair, provider: JsonRpcProvider): RawSigner {
    return new RawSigner(
        keypair, 
        provider, 
        new LocalTxnDataSerializer(provider)
    );
}

export function getSignerFromSeed(seed:string, provider: JsonRpcProvider): RawSigner {
    return getSignerFromKeyPair(getKeyPairFromSeed(seed), provider);
}


export function mintSUI(amount:number, address:string) {

}


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


export async function publishPackage(signer:RawSigner): Promise<SuiExecuteTransactionResponse>{

    const pkgPath = path.join(process.cwd(), "/firefly_exchange");    
    const compiledModules = JSON.parse(
        execCommand(`sui move build --dump-bytecode-as-base64 --path ${pkgPath}`)
    );

    const modulesInBytes = compiledModules.map((m:any) => 
        Array.from(new Base64DataBuffer(m).getData())
    );

    // publish package
    return signer.publishWithRequestType({
        compiledModules: modulesInBytes,
        gasBudget: 10000,
        });      
        
}