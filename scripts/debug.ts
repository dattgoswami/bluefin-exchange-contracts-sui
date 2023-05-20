import { DeploymentConfigs } from "../src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getSignerFromSeed,
    requestGas
} from "../src/utils";
import { OnChainCalls } from "../src/classes/OnChainCalls";
import { TEST_WALLETS } from "../tests/helpers/accounts";
import { Transaction } from "../src";

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

async function main() {}

main();
