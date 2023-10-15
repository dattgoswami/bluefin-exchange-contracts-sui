import {
    DeploymentConfigs,
    Faucet,
    getTestAccounts,
    TEST_WALLETS,
    toBaseNumber,
    toBigNumber,
    toBigNumberStr,
    TransactionBlock
} from "../submodules/library-sui";
import {
    readFile,
    getProvider,
    getSignerFromSeed,
    requestGas
} from "../submodules/library-sui";
import { OnChainCalls } from "../submodules/library-sui";
import { Transaction } from "../submodules/library-sui";

import {
    SuiEventFilter,
    Connection,
    SuiMoveObject,
    JsonRpcClient
} from "@mysten/sui.js";
import { SuiPythClient } from "@pythnetwork/pyth-sui-js";
import { JsonRpcProvider } from "@mysten/sui.js";
const deployment = readFile(DeploymentConfigs.filePath);

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

const onChain = new OnChainCalls(ownerSigner, deployment);

async function main() {}

main();
