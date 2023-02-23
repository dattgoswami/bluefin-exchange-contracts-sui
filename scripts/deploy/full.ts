import {
    getSignerSUIAddress,
    writeFile,
    getCreatedObjects,
    getSignerFromSeed,
    getProvider,
    publishPackageUsingClient,
    getDeploymentData,
    createMarket
} from "../../src/utils";
import { Client, OnChainCalls, Transaction } from "../../src/classes";
import { DeploymentConfigs } from "../../src/DeploymentConfig";

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);

const signer = getSignerFromSeed(DeploymentConfigs.deployer, provider);

async function main() {
    // info
    console.log(
        `Performing full deployment on: ${DeploymentConfigs.network.rpc}`
    );
    const deployerAddress = await getSignerSUIAddress(signer);

    console.log(`Deployer SUI address: ${deployerAddress}`);

    if (!Client.switchEnv(DeploymentConfigs.network.name)) {
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
        const deploymentData = getDeploymentData(deployerAddress, objects);

        // create perpetual
        console.log("Creating Perpetual Markets");
        for (const marketConfig of DeploymentConfigs.markets) {
            console.log(`-> ${marketConfig.name}`);
            const marketObjects = await createMarket(
                deploymentData,
                signer,
                provider,
                marketConfig
            );
            deploymentData["markets"].push({
                Config: marketConfig,
                Objects: marketObjects
            });
        }
        await writeFile(DeploymentConfigs.filePath, deploymentData);
        console.log(
            `Object details written to file: ${DeploymentConfigs.filePath}`
        );
    }
}

main();
