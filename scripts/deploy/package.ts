import {
    getAddressFromSigner,
    writeFile,
    getGenesisMap,
    getSignerFromSeed,
    getProvider,
    publishPackageUsingClient,
    getDeploymentData
} from "../../src/utils";
import { Transaction } from "../../src/classes";
import { DeploymentConfigs } from "../../src/DeploymentConfig";

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);
const signer = getSignerFromSeed(DeploymentConfigs.deployer, provider);

async function main() {
    // info
    console.log(`Publishing package on: ${DeploymentConfigs.network.rpc}`);
    const deployerAddress = await getAddressFromSigner(signer);
    console.log(`Deployer SUI address: ${deployerAddress}`);

    // public package
    const publishTxn = await publishPackageUsingClient();

    console.log("Package published");

    const status = Transaction.getStatus(publishTxn);
    console.log("Status:", status);

    if (status == "success") {
        // fetch created objects
        const objects = await getGenesisMap(provider, publishTxn);

        const deploymentData = getDeploymentData(deployerAddress, objects);

        await writeFile(DeploymentConfigs.filePath, deploymentData);
        console.log(
            `Object details written to file: ${DeploymentConfigs.filePath}`
        );
    }
}

main();
