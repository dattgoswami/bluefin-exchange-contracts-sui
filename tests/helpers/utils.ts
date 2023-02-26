import { RawSigner } from "@mysten/sui.js";
import BigNumber from "bignumber.js";
import { Balance } from "../../src/classes/Balance";
import { OnChainCalls } from "../../src/classes/OnChainCalls";
import { UserPosition, UserPositionExtended } from "../../src/interfaces";
import { BASE_DECIMALS, bigNumber, toBaseNumber } from "../../src/library";
import { getSignerSUIAddress, requestGas } from "../../src/utils";
import { TEST_WALLETS } from "./accounts";
import { TestPositionExpect } from "./interfaces";

export async function postDeployment(
    onChain: OnChainCalls,
    ownerSigner: RawSigner
) {
    await onChain.setSettlementOperator(
        { operator: await getSignerSUIAddress(ownerSigner), status: true },
        ownerSigner
    );
}

export async function fundTestAccounts() {
    for (const wallet of TEST_WALLETS) {
        await requestGas(wallet.address);
    }
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
        bankBalance: bigNumber(expect.bankBalance || 0),
        pnl: bigNumber(expect.pnl || 0)
    } as TestPositionExpect;
}

export function toExpectedPositionFormat(
    balance: Balance,
    oraclePrice: BigNumber,
    args?: { bankBalance?: BigNumber; pnl?: BigNumber }
): TestPositionExpect {
    return {
        isPosPositive: balance.isPosPositive,
        mro: balance.mro.shiftedBy(-BASE_DECIMALS),
        oiOpen: balance.oiOpen.shiftedBy(-BASE_DECIMALS),
        qPos: balance.qPos.shiftedBy(-BASE_DECIMALS),
        margin: balance.margin.shiftedBy(-BASE_DECIMALS),
        pPos: balance.pPos().shiftedBy(-BASE_DECIMALS),
        marginRatio: balance.marginRatio(oraclePrice).shiftedBy(-BASE_DECIMALS),
        bankBalance: args?.bankBalance
            ? args?.bankBalance.shiftedBy(-BASE_DECIMALS)
            : bigNumber(0),
        pnl: args?.pnl ? args?.pnl.shiftedBy(-BASE_DECIMALS) : bigNumber(0)
    } as TestPositionExpect;
}

export function printPosition(position: UserPosition | UserPositionExtended) {
    console.log("========= User Position =========");
    console.log("isPosPositive:", position.isPosPositive);
    console.log("margin:", toBaseNumber(position.margin));
    console.log("oiOpen:", toBaseNumber(position.oiOpen));
    console.log("qPos:", toBaseNumber(position.qPos));
    console.log("mro:", toBaseNumber(position.mro));
}
