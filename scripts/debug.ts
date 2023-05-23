import { DeploymentConfigs } from "../submodules/library-sui";
import {
    readFile,
    getProvider,
    getSignerFromSeed,
    requestGas
} from "../submodules/library-sui";
import { OnChainCalls } from "../submodules/library-sui";
//import { TEST_WALLETS } from "../submodules/library-sui";
import { Transaction } from "../submodules/library-sui";

import { SuiEventFilter } from "@mysten/sui.js";
import {
    parseEvent,
    parseEventData,
    parseEventType
} from "../chain-events-listener/src/utils";

const deployment = readFile(DeploymentConfigs.filePath);

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

const onChain = new OnChainCalls(ownerSigner, deployment);

async function main() {

    console.log(ownerSigner.getAddress());
}

main();
