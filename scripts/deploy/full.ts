import {
    getAddressFromSigner,
    writeFile,
    getGenesisMap,
    getSignerFromSeed,
    getProvider,
    publishPackageUsingClient,
    getDeploymentData,
    createMarket
} from "../../src/utils";
import { Client, Transaction } from "../../src/classes";
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
    const deployerAddress = await getAddressFromSigner(signer);

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
        const objects = await getGenesisMap(provider, publishTxn);
        const deploymentData = getDeploymentData(deployerAddress, objects);

        // create perpetual
        console.log("Creating Perpetual Markets");
        for (const marketConfig of DeploymentConfigs.markets) {
            console.log(`-> ${marketConfig.name}`);
            const { marketObjects, bankAccounts } = await createMarket(
                deploymentData,
                signer,
                provider,
                marketConfig
            );

            deploymentData["markets"][marketConfig.name as string] = {
                Config: marketConfig,
                Objects: marketObjects
            };

            deploymentData.bankAccounts = {
                ...deploymentData.bankAccounts,
                ...bankAccounts
            };
        }

        await writeFile(DeploymentConfigs.filePath, deploymentData);
        console.log(
            `Object details written to file: ${DeploymentConfigs.filePath}`
        );
    }
}

main();
