import { JsonRpcProvider, RawSigner } from "@mysten/sui.js";
import { OnChainCalls } from "../../src/classes/OnChainCalls";
import { UserPosition } from "../../src/interfaces";
import { BASE_DECIMALS, bigNumber } from "../../src/library";
import { getCreatedObjects, publishPackage } from "../../src/utils";
import { TestPositionExpect } from "./interfaces";

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

export function getExpectedTestPosition(expect: any): TestPositionExpect {
    return {
        isPosPositive: expect.qPos > 0,
        mro: bigNumber(expect.mro),
        oiOpen: bigNumber(expect.oiOpen),
        qPos: bigNumber(Math.abs(expect.qPos)),
        margin: bigNumber(expect.margin),
        pPos: bigNumber(expect.pPos),
        marginRatio: bigNumber(expect.marginRatio),
        bankBalance:
            expect.bankBalance != undefined
                ? bigNumber(expect.bankBalance)
                : undefined,
        fee: expect.fee != undefined ? bigNumber(expect.fee) : undefined
    } as TestPositionExpect;
}

// export function toTestPositionExpect(
//     balance: UserPosition,
//     // pPos: BigNumber,
//     // marginRatio: BigNumber,
//     // bankBalance?: BigNumber,
//     // fee?: BigNumber
// ): TestPositionExpect {
//     return {
//         isPosPositive: balance.isPosPositive,
//         mro: bigNumber(balance.mro).shiftedBy(-BASE_DECIMALS),
//         oiOpen: bigNumber(balance.oiOpen.shiftedBy(-BASE_DECIMALS)),
//         qPos: bigNumber(balance.qPos.shiftedBy(-BASE_DECIMALS)),
//         margin: bigNumber(balance.margin.shiftedBy(-BASE_DECIMALS)),
//         pPos: pPos.shiftedBy(-BASE_DECIMALS),
//         marginRatio: marginRatio.shiftedBy(-BASE_DECIMALS),
//         bankBalance: bankBalance ? bankBalance.shiftedBy(-BASE_DECIMALS) : undefined,
//         fee: fee ? fee.shiftedBy(-BASE_DECIMALS) : undefined
//     } as TestPositionExpect;
// }
