import { DeploymentConfigs } from "../submodules/library-sui";
import {
    readFile,
    getProvider,
    getSignerFromSeed,
    requestGas
} from "../submodules/library-sui";
import { OnChainCalls } from "../submodules/library-sui";
import { Transaction } from "../submodules/library-sui";

import { SuiEventFilter , Connection} from "@mysten/sui.js";
import { SuiPythClient } from "@pythnetwork/pyth-sui-js";
import { JsonRpcProvider} from "@mysten/sui.js"
const deployment = readFile(DeploymentConfigs.filePath);

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

const onChain = new OnChainCalls(ownerSigner, deployment);

async function main() {
const wormholeStateId = "0xebba4cc4d614f7a7cdbe883acc76d1cc767922bc96778e7b68be0d15fce27c02";
const pythStateId = "0xd8afde3a48b4ff7212bd6829a150f43f59043221200d63504d981f62bff2e27a";
const provider= new JsonRpcProvider(new Connection({ fullnode: DeploymentConfigs.network.rpc, faucet: DeploymentConfigs.network.faucet }));
const client = new SuiPythClient(provider, pythStateId, wormholeStateId);
const res=await client.getPriceFeedObjectId("0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6")

console.log(client); 

}

main();
