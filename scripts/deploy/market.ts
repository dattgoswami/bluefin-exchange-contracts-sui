import {
    getSignerSUIAddress,
    writeFile,
    getCreatedObjects,
    getSignerFromSeed,
    getProvider,
    getDeploymentData,
    createMarket
} from "../../src/utils";
import { Client, OnChainCalls } from "../../src/classes";
import { DeploymentConfigs, market } from "../../src/DeploymentConfig";

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);

const signer = getSignerFromSeed(DeploymentConfigs.deployer, provider);

async function main() {
    // info
    console.log(
        `Deploying market ${market} on : ${DeploymentConfigs.network.rpc}`
    );
    const deployerAddress = await getSignerSUIAddress(signer);

    console.log(`Deployer SUI address: ${deployerAddress}`);

    if (!Client.switchEnv(DeploymentConfigs.network.name)) {
        process.exit(1);
    }

    if (!Client.switchAccount(deployerAddress)) {
        process.exit(1);
    }
    const objects = require("../../deployment.json")["objects"];

    const deploymentData = await getDeploymentData(deployerAddress, objects);

    const onChain = new OnChainCalls(signer, deploymentData);

    // create perpetual
    const marketConfig = DeploymentConfigs.markets.filter((data) => {
        if (data["name"] == market) {
            return true;
        }
    })[0];

    const marketObjectMap = await createMarket(
        deploymentData,
        signer,
        provider,
        marketConfig
    );

    deploymentData["markets"].push({
        Config: marketConfig,
        Objects: marketObjectMap
    });

    await writeFile(DeploymentConfigs.filePath, deploymentData);
    console.log(
        `Object details written to file: ${DeploymentConfigs.filePath}`
    );
}

main();
