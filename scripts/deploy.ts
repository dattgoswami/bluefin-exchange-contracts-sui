import {
    getSignerSUIAddress,
    writeFile,
    publishPackage,
    getCreatedObjects,
    getSignerFromSeed,
    getProvider,
    getStatus,
} from "../src/utils";
import { OnChainCalls } from "../src/OnChainCalls";
import { DeploymentConfig } from "../src/DeploymentConfig";

const provider = getProvider(
    DeploymentConfig.rpcURL,
    DeploymentConfig.faucetURL
);
const signer = getSignerFromSeed(DeploymentConfig.deployer, provider);

async function main() {
    // info
    console.log(`Performing deployment on: ${DeploymentConfig.rpcURL}`);
    const deployerAddress = await getSignerSUIAddress(signer);

    console.log(`Deployer SUI address: ${deployerAddress}`);

    // public package
    const publishTxn = await publishPackage(signer);

    console.log("Package published");

    const status = getStatus(publishTxn);
    console.log("Status:", status);

    if (status['status'] == 'success'){
        // fetch created objects
        const objects = await getCreatedObjects(provider, publishTxn); 
        
        const dataToWrite = {
            'deployer': deployerAddress,
            'moduleName': 'perpetual', //TODO extract from deployed module
            'objects': objects,
            'markets': []
        }

        const onChain = new OnChainCalls(signer, dataToWrite);

        // create perpetual
        console.log("Creating Perpetual Markets");
        for (const market of DeploymentConfig.markets) {
            console.log(`-> ${market.name}`);
            const txResult = await onChain.createPerpetual(market);
            const objects = await getCreatedObjects(provider, txResult);
            (dataToWrite["markets"] as any).push({
                Config: market,
                Objects: objects
            });
        }

        await writeFile(DeploymentConfig.filePath, dataToWrite);
        console.log(`Object details written to file: ${DeploymentConfig.filePath}`);
    }
}

main();
