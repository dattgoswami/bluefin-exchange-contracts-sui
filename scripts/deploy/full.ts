import {
    writeFile,
    getGenesisMap,
    getSignerFromSeed,
    getProvider,
    publishPackage,
    packDeploymentData,
    createMarket,
    getBankTable
} from "../../submodules/library-sui";
import { Client, Transaction } from "../../submodules/library-sui";
import { DeploymentConfigs } from "../../submodules/library-sui";

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
    const deployerAddress = await signer.getAddress();

    console.log(`Deployer SUI address: ${deployerAddress}`);

    if (!Client.switchEnv(DeploymentConfigs.network.name)) {
        process.exit(1);
    }

    // public package
    console.log("publishing package");
    const publishTxn = await publishPackage(false, signer);

    console.log("Package published");

    const status = Transaction.getStatus(publishTxn);
    console.log("Status:", status);

    if (status == "success") {
        // fetch created objects
        const objects = await getGenesisMap(provider, publishTxn);

        objects["BankTable"] = await getBankTable(provider, objects);

        const deploymentData = packDeploymentData(deployerAddress, objects);

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

            deploymentData["markets"][marketConfig.name as string] = {
                Config: marketConfig,
                Objects: marketObjects
            };
        }

        await writeFile(DeploymentConfigs.filePath, deploymentData);
        console.log(
            `Object details written to file: ${DeploymentConfigs.filePath}`
        );
    }
}

main();
