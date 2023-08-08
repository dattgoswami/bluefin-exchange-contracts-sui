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
//import {
 //   parseEvent,
  //  parseEventData,
   // parseEventType
//} from "../chain-events-listener/src/utils";

const deployment = readFile(DeploymentConfigs.filePath);

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

const onChain = new OnChainCalls(ownerSigner, deployment);

async function main() {

    console.log(ownerSigner.getAddress());
   // console.log(await onChain.getOraclePrice());
    const res=await provider.getObject({
        id: "0x878b118488aeb5763b5f191675c3739a844ce132cb98150a465d9407d7971e7c",
        options: {
            showContent: true
        }
    });
    console.log(res);
}

main();
