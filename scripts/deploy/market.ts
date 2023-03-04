import {
    getAddressFromSigner,
    writeFile,
    getSignerFromSeed,
    getProvider,
    getDeploymentData,
    createMarket
} from "../../src/utils";
import { Client } from "../../src/classes";
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
    const deployerAddress = await getAddressFromSigner(signer);

    console.log(`Deployer SUI address: ${deployerAddress}`);

    if (!Client.switchEnv(DeploymentConfigs.network.name)) {
        process.exit(1);
    }

    if (!Client.switchAccount(deployerAddress)) {
        process.exit(1);
    }
    const path = "../../deployment.json";
    const data = await import(path);
    const deployment = getDeploymentData(
        data.deployer,
        data.objects,
        data.markets,
        data.bankAccounts
    );

    console.log(`Creating perpetual for market: ${market}`);

    // create perpetual
    const marketConfig = DeploymentConfigs.markets.filter((data) => {
        if (data["name"] == market) {
            return true;
        }
    })[0];

    if (marketConfig == undefined) {
        console.log(
            `Error: Market details not found for market ${market} in deployment config`
        );
        process.exit(1);
    }

    const marketMap = await createMarket(
        deployment,
        signer,
        provider,
        marketConfig
    );

    deployment.markets[marketConfig.name as string] = {
        Config: marketConfig,
        Objects: marketMap.marketObjects
    };

    deployment.bankAccounts = {
        ...deployment.bankAccounts,
        ...marketMap.bankAccounts
    };

    await writeFile(DeploymentConfigs.filePath, deployment);
    console.log(
        `Object details written to file: ${DeploymentConfigs.filePath}`
    );
}

main();
