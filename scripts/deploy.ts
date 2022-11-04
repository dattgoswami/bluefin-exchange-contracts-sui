
import path from "path";
import { Ed25519Keypair, JsonRpcProvider, RawSigner, Base64DataBuffer, LocalTxnDataSerializer } from '@mysten/sui.js';
import { DeploymentConfig } from "../config/DeploymentConfig";
import { execCommand, writeFile } from "../src/utils";
import { getCreatedObjects } from "../src/objects";

const keypair = Ed25519Keypair.deriveKeypair(DeploymentConfig.deployer);
const provider = new JsonRpcProvider(DeploymentConfig.rpcURL);
const signer = new RawSigner(keypair, provider, new LocalTxnDataSerializer(provider));

async function main(){
    console.log(`Performing deployment on: ${DeploymentConfig.rpcURL}`);
    console.log(`Deployer SUI address: ${await signer.getAddress()}`)

    const pkgPath = path.join(process.cwd(), "/firefly_exchange");

    
    const compiledModules = JSON.parse(
        execCommand(`sui move build --dump-bytecode-as-base64 --path ${pkgPath}`)
    );

    const modulesInBytes = compiledModules.map((m:any) => 
        Array.from(new Base64DataBuffer(m).getData())
    );

    const publishTxn = await signer.publishWithRequestType({
        compiledModules: modulesInBytes,
        gasBudget: 10000,
        });

    console.log("Package published");
    
    const objects = await getCreatedObjects(provider, publishTxn);
    
    await writeFile(DeploymentConfig.filePath, objects)
    
    console.log(`Object details written to file: ${DeploymentConfig.filePath}`);
    
}




main();
