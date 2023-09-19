import { DeploymentConfigs } from "../submodules/library-sui";
import {
    readFile,
    getProvider,
    getSignerFromSeed
} from "../submodules/library-sui";
import { OnChainCalls } from "../submodules/library-sui";

const deployment = readFile(DeploymentConfigs.filePath);

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

const onChain = new OnChainCalls(ownerSigner, deployment);

async function main() {
    //calling function.
    await onChain.setOraclePrice({
        price: 28000,
        market: "BTC-PERP"
    });
}

main();
