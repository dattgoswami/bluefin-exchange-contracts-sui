import {
    getSignerSUIAddress,
    writeFile,
    publishPackage,
    getCreatedObjects,
    getSignerFromSeed,
    getProvider,
    publishPackageUsingClient
} from "../../src/utils";
import { Client, OnChainCalls, Transaction } from "../../src/classes";
import { DeploymentConfig } from "../../src/DeploymentConfig";

const provider = getProvider(
    DeploymentConfig.network.rpc,
    DeploymentConfig.network.faucet
);

const signer = getSignerFromSeed(DeploymentConfig.deployer, provider);

async function main() {
    // info
    console.log(
        `Performing full deployment on: ${DeploymentConfig.network.rpc}`
    );
    const deployerAddress = await getSignerSUIAddress(signer);

    console.log(`Deployer SUI address: ${deployerAddress}`);

    if (!Client.switchEnv(DeploymentConfig.network.name)) {
        process.exit(1);
    }

    if (!Client.switchAccount(deployerAddress)) {
        process.exit(1);
    }

    // public package
    const publishTxn = await publishPackageUsingClient();

    console.log("Package published");

    const status = Transaction.getStatus(publishTxn);
    console.log("Status:", status);

    if (status == "success") {
        // fetch created objects
        const objects = await getCreatedObjects(provider, publishTxn);

        const dataToWrite = {
            deployer: deployerAddress,
            moduleName: "perpetual", //TODO extract from deployed module
            objects: objects,
            markets: []
        };

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
        console.log(
            `Object details written to file: ${DeploymentConfig.filePath}`
        );
    }
}

main();
