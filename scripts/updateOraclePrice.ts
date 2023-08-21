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

    //calling function.
    const result = await onChain.setOraclePrice({
        price: 100,
        priceInfoFeedId: pythObj["ETH-PERP-FEED-ID"],
        pythPackageId: pythPackage.objects.package.id
    });
    console.log(result);
}

main();
