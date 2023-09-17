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
    //only suitable for local
    const pythObj = readFile("./pyth/priceInfoObject.json");
    const pythPackage = readFile("./pythFakeDeployment.json");

    //calling function.
    const result = await onChain.setOraclePrice({
        price: 1000,
        priceInfoFeedId:
            pythObj["ETH-PERP"][process.env.DEPLOY_ON as string]["feed_id"],
        pythPackageId: pythPackage.objects.package.id
    });

    //calling function.
    const result2 = await onChain.setOraclePrice({
        price: 1020,
        priceInfoFeedId:
            pythObj["BTC-PERP"][process.env.DEPLOY_ON as string]["feed_id"],
        pythPackageId: pythPackage.objects.package.id
    });
    console.log(result);
    console.log(result2);
}

main();
