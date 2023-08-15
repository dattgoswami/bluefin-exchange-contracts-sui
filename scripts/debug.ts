import { DeploymentConfigs } from "../submodules/library-sui";
import {
    readFile,
    getProvider,
    getSignerFromSeed,
    requestGas
} from "../submodules/library-sui";
import { OnChainCalls } from "../submodules/library-sui";
import { Transaction } from "../submodules/library-sui";

import { SuiEventFilter } from "@mysten/sui.js";

const deployment = readFile(DeploymentConfigs.filePath);

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

const onChain = new OnChainCalls(ownerSigner, deployment);

async function main() {
    const priceInfoFeedId =
        "c6c75c89f14810ec1c54c03ab8f1864a4c4032791f05747f560faec380a695d1";
    const pythPackageId =
        "0x981a6035f22971ea28157be27d3b86477d518ae2bb0e279852c8fedab8229a82";

    const result = await onChain.setOraclePrice(
        "100000000000",
        "10",
        priceInfoFeedId,
        ""
    );
    console.log(result);
}

main();
