import {
    writeFile,
    getGenesisMap,
    getSignerFromSeed,
    getProvider,
    packDeploymentData,
    createMarket,
    getBankTable,
    readFile,
    packageName,
    market
} from "../../submodules/library-sui";
import { DeploymentConfigs, Transaction } from "../../submodules/library-sui";
import { Client } from "../../src/Client";
import { publishPackage,getFilePathFromEnv } from "../../src/helpers";

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);

const signer = getSignerFromSeed(DeploymentConfigs.deployer, provider);

function hextoString(hex: any): string{
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      const hexValue = hex.substr(i, 2);
      const decimalValue = parseInt(hexValue, 16);
      str += String.fromCharCode(decimalValue);
    }
    return str;
};
async function main() {
    console.log("Reading Pyth Object file");
    const pythObj=readFile(getFilePathFromEnv());

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
    const publishTxn = await publishPackage(false, signer, "bluefin_foundation");

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
            marketConfig.priceInfoFeedId=pythObj[marketConfig.symbol+'-FEED-ID']
            marketConfig.priceInfoFeedId=hextoString(marketConfig.priceInfoFeedId);
            console.log(`-> ${marketConfig.symbol}`);
            const marketObjects = await createMarket(
                deploymentData,
                signer,
                provider,
                marketConfig,
                pythObj[marketConfig.symbol as string]
            );

            deploymentData["markets"][marketConfig.symbol as string] = {
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
