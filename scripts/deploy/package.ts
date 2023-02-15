import {
    getSignerSUIAddress,
    writeFile,
    publishPackage,
    getCreatedObjects,
    getSignerFromSeed,
    getProvider,
    publishPackageUsingClient
} from "../../src/utils";
import { Transaction } from "../../src/classes";
import { DeploymentConfig } from "../../src/DeploymentConfig";

const provider = getProvider(
    DeploymentConfig.network.rpc,
    DeploymentConfig.network.faucet
);
const signer = getSignerFromSeed(DeploymentConfig.deployer, provider);

async function main() {
    // info
    console.log(`Publishing package on: ${DeploymentConfig.network.rpc}`);
    const deployerAddress = await getSignerSUIAddress(signer);
    console.log(`Deployer SUI address: ${deployerAddress}`);

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

        await writeFile(DeploymentConfig.filePath, dataToWrite);
        console.log(
            `Object details written to file: ${DeploymentConfig.filePath}`
        );
    }
}

main();
