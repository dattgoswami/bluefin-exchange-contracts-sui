import {
    writeFile,
    getSignerFromSeed,
    getProvider,
    packageName
} from "../../submodules/library-sui";

import {
    getGenesisMap,
    packDeploymentData,
    getBankTable
} from "../../src/deployment";
import { usdcAddress } from "../../submodules/library-sui";

import { DeploymentConfigs } from "../../submodules/library-sui";
import { Transaction } from "../../submodules/library-sui";
import { Client } from "../../src/Client";
import { postDeployment, publishPackage } from "../../src/helpers";

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);
const signer = getSignerFromSeed(DeploymentConfigs.deployer, provider);
async function main() {
    // info
    console.log(`Publishing package on: ${DeploymentConfigs.network.rpc}`);

    const deployerAddress = await signer.getAddress();
    console.log(`Deployer SUI address: ${deployerAddress}`);

    if (!Client.switchEnv(DeploymentConfigs.network.name)) {
        process.exit(1);
    }

    // public package
    const publishTxn = await publishPackage(false, signer, packageName);

    console.log("Package published");

    const status = Transaction.getStatus(publishTxn);
    console.log("Status:", status);

    if (status == "success") {
        // fetch created objects
        const objects = await getGenesisMap(provider, publishTxn);

        let deploymentData = packDeploymentData(deployerAddress, objects);

        // for dev env our own package id the owner of coin package
        let coinPackageId = deploymentData["objects"]["package"]["id"];

        if (process.env.ENV == "PROD" && process.env.DEPLOY_ON == "mainnet") {
            console.log("Using SUI USDC coin");
            coinPackageId = usdcAddress;
            console.log(coinPackageId);
        }

        deploymentData = await postDeployment(
            signer,
            deploymentData,
            coinPackageId
        );

        await writeFile(DeploymentConfigs.filePath, deploymentData);
        console.log(
            `Object details written to file: ${DeploymentConfigs.filePath}`
        );
    }
}

main();
