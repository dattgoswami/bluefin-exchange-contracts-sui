import {
    getSignerSUIAddress,
    writeFile,
    getCreatedObjects,
    getSignerFromSeed,
    getProvider
} from "../../src/utils";
import { Client, OnChainCalls } from "../../src/classes";
import { DeploymentConfig, market } from "../../src/DeploymentConfig";

const provider = getProvider(
    DeploymentConfig.network.rpc,
    DeploymentConfig.network.faucet
);

const signer = getSignerFromSeed(DeploymentConfig.deployer, provider);

async function main() {
    // info
    console.log(
        `Deploying market ${market} on : ${DeploymentConfig.network.rpc}`
    );
    const deployerAddress = await getSignerSUIAddress(signer);

    console.log(`Deployer SUI address: ${deployerAddress}`);

    if (!Client.switchEnv(DeploymentConfig.network.name)) {
        process.exit(1);
    }

    if (!Client.switchAccount(deployerAddress)) {
        process.exit(1);
    }
    const objects = require("../../deployment.json")["objects"];

    const dataToWrite = {
        deployer: deployerAddress,
        moduleName: "perpetual", //TODO extract from deployed module
        objects: objects,
        markets: []
    };

    const onChain = new OnChainCalls(signer, dataToWrite);

    // create perpetual
    const marketData = DeploymentConfig.markets.filter((data) => {
        if (data["name"] == market) {
            return true;
        }
    })[0];

    const txResult = await onChain.createPerpetual(marketData);

    const marketObjects = await getCreatedObjects(provider, txResult);

    (dataToWrite["markets"] as any).push({
        Config: marketData,
        Objects: marketObjects
    });

    await writeFile(DeploymentConfig.filePath, dataToWrite);
    console.log(`Object details written to file: ${DeploymentConfig.filePath}`);
}

main();
