import { JsonRpcProvider, RawSigner, Ed25519Keypair, LocalTxnDataSerializer} from "@mysten/sui.js";

const { execSync } = require('child_process');
const fs = require("fs");

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

export function getProvider(rpcURL: string): JsonRpcProvider {
    return new JsonRpcProvider(rpcURL);
}

export async function getSignerSUIAddress(signer:RawSigner): Promise<string> {
    const address = await signer.getAddress();
    return `0x${address}`

}

export function getSigner(deployerSeed: string, provider: JsonRpcProvider): RawSigner {

    return new RawSigner(
        Ed25519Keypair.deriveKeypair(deployerSeed), 
        provider, 
        new LocalTxnDataSerializer(provider)
    );
}