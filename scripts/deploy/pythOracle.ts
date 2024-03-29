import {
    writeFile,
    OnChainCalls,
    getProvider,
    getSignerFromSeed,
    DeploymentConfigs,
    Transaction,
    readFile
} from "../../submodules/library-sui";

import { getGenesisMap, packDeploymentData } from "../../src/deployment";
import { Client } from "../../src/Client";
import { publishPackage, editTomlFile } from "../../src/helpers";
import * as fs from "fs";
const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);

const signer = getSignerFromSeed(DeploymentConfigs.deployer, provider);

function byteArrayToHexString(byteArray: number[]): string {
    return byteArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getFeedIdFromObj(obj: any): string {
    const val =
        obj.data.content.fields.price_info.fields.price_feed.fields
            .price_identifier.fields.bytes;
    return byteArrayToHexString(val);
}

async function main() {
    const pythTomlFilePath = "./pyth/Move.toml";
    editTomlFile(pythTomlFilePath, "0x0");
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
    const publishTxn = await publishPackage(false, signer, "pyth");

    console.log("Package published");

    const status = Transaction.getStatus(publishTxn);
    console.log("Status:", status);

    if (status == "success") {
        // fetch created objects
        const objects = await getGenesisMap(provider, publishTxn);
        const deploymentData = packDeploymentData(deployerAddress, objects);

        const filename = "./pythFakeDeployment.json";
        await writeFile(filename, deploymentData);
        console.log(`Object details written to file: ${filename}`);
        const address = deploymentData.objects.package.id;
        editTomlFile(pythTomlFilePath, address, true);

        const contractFilePath = "./bluefin_foundation/Move.local.toml";
        editTomlFile(contractFilePath, address, false, true);

        // Copying the file from Bluefin foundation local to Move.toml
        fs.copyFile(
            contractFilePath,
            "./bluefin_foundation/Move.toml",
            (err: any) => {
                if (err) {
                    console.log("Error Found:", err);
                } else {
                    console.log(
                        "File Copied Succesfully to bluefin_foundation/Move.toml"
                    );
                }
            }
        );

        console.log("Creating an object for Oracle Price");
        const onChain = new OnChainCalls(signer, deploymentData);
        const caller = onChain.signer;
        const callArgs = [];
        callArgs.push("0x6");

        let res = await onChain.signAndCall(
            caller,
            "create_price_obj_for_eth",
            callArgs,
            "price_info"
        );
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        const objectIdETH = res.effects.created[0].reference.objectId;
        const objEth = await onChain.getOnChainObject(objectIdETH);
        const ethFeedId = getFeedIdFromObj(objEth);

        res = await onChain.signAndCall(
            caller,
            "create_price_obj_for_btc",
            callArgs,
            "price_info"
        );

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        const objectIdBTC = res.effects.created[0].reference.objectId;
        const objBtc = await onChain.getOnChainObject(objectIdBTC);
        const btcFeedId = getFeedIdFromObj(objBtc);

        const pythFileObj = readFile("./pyth/priceInfoObject.json");

        pythFileObj["BTC-PERP"][process.env.DEPLOY_ON as string]["feed_id"] =
            btcFeedId;
        pythFileObj["BTC-PERP"][process.env.DEPLOY_ON as string]["object_id"] =
            objectIdBTC;

        pythFileObj["ETH-PERP"][process.env.DEPLOY_ON as string]["feed_id"] =
            ethFeedId;
        pythFileObj["ETH-PERP"][process.env.DEPLOY_ON as string]["object_id"] =
            objectIdETH;

        writeFile("./pyth/priceInfoObject.json", pythFileObj);

        console.log(
            "Pyth Fake conrtracts deployed successfully and objects written to file"
        );
    }
}

main();
