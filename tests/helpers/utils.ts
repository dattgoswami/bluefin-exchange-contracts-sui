import { JsonRpcProvider, RawSigner } from "@mysten/sui.js";
import { OnChainCalls } from "../../src/classes/OnChainCalls";
import { getCreatedObjects, publishPackage } from "../../src/utils";

export async function test_deploy_package(
    ownerAddress: string,
    ownerSigner: RawSigner,
    provider: JsonRpcProvider
): Promise<any> {
    const publishTX = await publishPackage(ownerSigner);
    const objects = await getCreatedObjects(provider, publishTX);
    const deployment = {
        deployer: ownerAddress,
        moduleName: "perpetual",
        objects: objects,
        markets: []
    };
    return deployment as any;
}

export async function test_deploy_market(
    deployment: any,
    ownerSigner: RawSigner,
    provider: JsonRpcProvider
) {
    const onChain = new OnChainCalls(ownerSigner, deployment);

    const txResult = await onChain.createPerpetual({});
    const objects = await getCreatedObjects(provider, txResult);

    return { Objects: objects };
}
