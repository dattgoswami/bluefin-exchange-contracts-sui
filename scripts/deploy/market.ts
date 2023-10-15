import {
    writeFile,
    getSignerFromSeed,
    getProvider,
    readFile
} from "../../submodules/library-sui";
import { packDeploymentData, createMarket } from "../../src/deployment";
import { Client } from "../../src/Client";
import { DeploymentConfigs, market } from "../../submodules/library-sui";

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
    const deployerAddress = await signer.getAddress();

    console.log(`Deployer SUI address: ${deployerAddress}`);

    if (!Client.switchEnv(DeploymentConfigs.network.name)) {
        process.exit(1);
    }

    console.log("Reading Pyth Object file");

    const pythObj = readFile("./pyth/priceInfoObject.json");

    const path = "../../deployment.json";
    const data = await import(path);
    const deployment = packDeploymentData(
        data.deployer,
        data.objects,
        data.markets
    );

    console.log(`Creating perpetual for market: ${market}`);

    // create perpetual
    const marketConfig = DeploymentConfigs.markets.filter((data) => {
        if (data["symbol"] == market) {
            return true;
        }
    })[0];

    if (marketConfig == undefined) {
        console.log(
            `Error: Market details not found for market ${market} in deployment config`
        );
        process.exit(1);
    }
    marketConfig.priceInfoFeedId =
        pythObj[marketConfig.symbol as string][process.env.DEPLOY_ON as string][
            "feed_id"
        ];

    const marketMap = await createMarket(
        deployment,
        signer,
        provider,
        pythObj[marketConfig.symbol as string][process.env.DEPLOY_ON as string][
            "object_id"
        ],
        marketConfig
    );

    deployment.markets[marketConfig.symbol as string] = {
        Config: marketConfig,
        Objects: marketMap
    };

    await writeFile(DeploymentConfigs.filePath, deployment);
    console.log(
        `Object details written to file: ${DeploymentConfigs.filePath}`
    );
}

main();
