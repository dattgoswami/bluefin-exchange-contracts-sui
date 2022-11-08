import { JsonRpcProvider, RawSigner, Ed25519Keypair, LocalTxnDataSerializer, Keypair} from "@mysten/sui.js";
import { config } from "dotenv";
const { execSync } = require('child_process');
const fs = require("fs");
config({ path: ".env" });

const FAUCET_URL = process.env.FAUCET_URL;


export interface wallet{
    address:string,
    phrase: string
}

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

