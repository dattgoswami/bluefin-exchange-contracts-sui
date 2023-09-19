import {
    writeFile,
    getSignerFromSeed,
    getProvider,
    readFile,
    packageName,
    DeploymentConfigs,
    Transaction,
    TransactionBlock
} from "../../submodules/library-sui";
import { Connection, JsonRpcProvider } from "@mysten/sui.js";
import { SuiPythClient } from "@pythnetwork/pyth-sui-js";
import { Client } from "../../src/Client";
import {
    checkPythPriceInfoObjects,
    postDeployment,
    publishPackage
} from "../../src/helpers";
import {
    getBankTable,
    getGenesisMap,
    packDeploymentData,
    createMarket
} from "../../src/deployment";
import { usdcAddress } from "../../submodules/library-sui";
import { syncingTomlFiles } from "../../src/helpers";
const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);

const signer = getSignerFromSeed(DeploymentConfigs.deployer, provider);

async function main() {
    // Updating object id from feed id
    console.log("Reading Pyth Object file");
    const pythObj = readFile("./pyth/priceInfoObject.json");
    const deployEnv = process.env.DEPLOY_ON + "_pyth";

    
    //True oracle will be deployed only if we are deploying on prod and mainnet
    if (process.env.ENV == "PROD" && process.env.DEPLOY_ON=="mainnet") {
        console.log(
            "Updating price object ids from price feed ids from respective network"
        );
        const provider_pyth = new JsonRpcProvider(
            new Connection({
                fullnode: DeploymentConfigs.network.rpc,
                faucet: DeploymentConfigs.network.faucet
            })
        );

        const pythclient = new SuiPythClient(
            provider_pyth,
            pythObj[deployEnv]["pyth_state"],
            pythObj[deployEnv]["wormhole_state"]
        );

        for (const marketConfig of DeploymentConfigs.markets) {
            const res = await pythclient.getPriceFeedObjectId(
                "0x" +
                    pythObj[marketConfig.symbol as string][
                        process.env.DEPLOY_ON as string
                    ]["feed_id"]
            );
            if (res == undefined) {
                console.log("cannot fetch price object id");
                process.exit(1);
            } else {
                pythObj[marketConfig.symbol as string][
                    process.env.DEPLOY_ON as string
                ]["object_id"] = res;
            }
        }
        writeFile("./pyth/priceInfoObject.json", pythObj);
        console.log("Syncing Toml file with package ids from json file");
        syncingTomlFiles(pythObj[deployEnv]);
    }

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
    const publishTxn = await publishPackage(false, signer, packageName);

    console.log("Package published");

    const status = Transaction.getStatus(publishTxn);
    console.log("Status:", status);

    if (status == "success") {
        // fetch created objects
        const objects = await getGenesisMap(provider, publishTxn);

        const deploymentData = packDeploymentData(deployerAddress, objects);

        // for dev env our own package id the owner of coin package
        let coinPackageId = deploymentData["objects"]["package"]["id"];

        if (process.env.ENV == "PROD" && process.env.DEPLOY_ON == "mainnet") {
            console.log("Using SUI USDC coin");
            coinPackageId = usdcAddress;
            console.log(coinPackageId);
        }

        deploymentData["objects"]["Bank"] = await postDeployment(
            signer,
            deploymentData,
            coinPackageId
        );
        deploymentData["objects"]["BankTable"] = await getBankTable(
            provider,
            deploymentData
        );

        // create perpetual
        console.log("Creating Perpetual Markets");
        for (const marketConfig of DeploymentConfigs.markets) {
            marketConfig.priceInfoFeedId =
                pythObj[marketConfig.symbol as string][
                    process.env.DEPLOY_ON as string
                ]["feed_id"];
            console.log(`-> ${marketConfig.symbol}`);
            const marketObjects = await createMarket(
                deploymentData,
                signer,
                provider,
                pythObj[marketConfig.symbol as string][
                    process.env.DEPLOY_ON as string
                ]["object_id"],
                marketConfig
            );

            deploymentData["markets"][marketConfig.symbol as string] = {
                Config: marketConfig,
                Objects: marketObjects
            };
        }

        console.log("Checking if PythPriceObjects are consistent");
        if (!(await checkPythPriceInfoObjects(signer, deploymentData))) {
            console.error("Wrong Price Identifier Set, check configuration");
            process.exit(-1);
        }


        await writeFile(DeploymentConfigs.filePath, deploymentData);
        console.log(
            `Object details written to file: ${DeploymentConfigs.filePath}`
        );
    }
}

main();
