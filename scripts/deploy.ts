
import path from "path";
import { Ed25519Keypair, JsonRpcProvider, RawSigner, Base64DataBuffer, LocalTxnDataSerializer } from '@mysten/sui.js';
import { DeploymentConfig } from "../src/DeploymentConfig";
import { execCommand, getSignerSUIAddress, writeFile } from "../src/utils";
import { getCreatedObjects } from "../src/objects";
import { OnChainCalls } from "../src/OnChainCalls";

const keypair = Ed25519Keypair.deriveKeypair(DeploymentConfig.deployer);
const provider = new JsonRpcProvider(DeploymentConfig.rpcURL);
const signer = new RawSigner(keypair, provider, new LocalTxnDataSerializer(provider));


async function main(){

    // info
    console.log(`Performing deployment on: ${DeploymentConfig.rpcURL}`);
    const deployerAddress = await getSignerSUIAddress(signer);
    console.log(`Deployer SUI address: ${deployerAddress}`)


    // compile package
    const pkgPath = path.join(process.cwd(), "/firefly_exchange");    
    const compiledModules = JSON.parse(
        execCommand(`sui move build --dump-bytecode-as-base64 --path ${pkgPath}`)
    );

    const modulesInBytes = compiledModules.map((m:any) => 
        Array.from(new Base64DataBuffer(m).getData())
    );

    // publish package
    const publishTxn = await signer.publishWithRequestType({
        compiledModules: modulesInBytes,
        gasBudget: 10000,
        });

    console.log("Package published");
    
    // fetch created objects
    const objects = await getCreatedObjects(provider, publishTxn); 
    
    const dataToWrite = {
        'deployer': deployerAddress,
        'moduleName': 'foundation', //TODO extract from deployed module
        'objects': objects,
        'markets': []
    }


    const onChain = new OnChainCalls(signer, dataToWrite);

    // create perpetual
    console.log("Creating Perpetual Markets");
    for (const market of DeploymentConfig.markets){
        console.log(`-> ${market.name}`);
        const txResult = await onChain.createPerpetual(market);
        const objects = await getCreatedObjects(provider, txResult);
        (dataToWrite['markets'] as any).push({
            'Config': market,
            'Objects':objects
        });
    }

    await writeFile(DeploymentConfig.filePath, dataToWrite)
    console.log(`Object details written to file: ${DeploymentConfig.filePath}`);
    
}




main();
