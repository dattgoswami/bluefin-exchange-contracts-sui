import { DeploymentConfigs, market } from "../submodules/library-sui";
import {
    readFile,
    getProvider,
    getSignerFromSeed,
    requestGas
} from "../submodules/library-sui";
import { OnChainCalls } from "../submodules/library-sui";
import { Transaction } from "../submodules/library-sui";
import { publishPackage, getFilePathFromEnv } from "../src/helpers";

import { SuiEventFilter } from "@mysten/sui.js";

const deployment = readFile(DeploymentConfigs.filePath);

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

const onChain = new OnChainCalls(ownerSigner, deployment);

async function main() {
    //only suitable for local
    const pythObj = readFile(getFilePathFromEnv());
    const pythPackage = readFile("./pythFakeDeployment.json");

    // get the feed id
    const ethFeed = pythObj["ETH-PERP-FEED-ID"];

    const pythPackagId = pythPackage.objects.package.id;

    //calling function.
    const result = await onChain.setOraclePrice(
        "100000000000",
        "10",
        ethFeed,
        pythPackagId
    );
    console.log(result);
}

main();
