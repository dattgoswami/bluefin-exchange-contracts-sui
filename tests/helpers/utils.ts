import { RawSigner } from "@mysten/sui.js";
import BigNumber from "bignumber.js";
import { Transaction } from "../../src";
import { Balance } from "../../src/classes/Balance";
import { OnChainCalls } from "../../src/classes/OnChainCalls";
import { BASE_DECIMALS, bigNumber, toBigNumberStr } from "../../src/library";
import { requestGas } from "../../src/utils";
import { TEST_WALLETS } from "./accounts";
import { expectTxToSucceed } from "./expect";
import { TestPositionExpect } from "./interfaces";

export async function mintAndDeposit(
    onChain: OnChainCalls,
    receiver: string,
    amount?: number
): Promise<string> {
    const amt = amount || 100_000;
    const ownerAddress = await onChain.signer.getAddress();

    let coin = undefined;
    // TODO figure out why `onChain.getUSDCCoins` calls returns no coin
    // until then use while
    while (coin == undefined) {
        // get USDC balance of owner
        const ownerBalance = await onChain.getUSDCBalance();

        // mint coins for owner
        if (amt > ownerBalance) {
            const tx = await onChain.mintUSDC({
                amount: toBigNumberStr(1_000_000_000, 6)
            });
            expectTxToSucceed(tx);
        }

        // TODO: implement a method to get the coin with balance > amt
        // assuming 0th index coin will have balance > amount
        const usdcCoins = await onChain.getUSDCCoins({ address: ownerAddress });
        coin = usdcCoins.data.pop();
    }

    // transferring from owners usdc coin to receiver
    const tx = await onChain.depositToBank({
        coinID: coin.coinObjectId,
        amount: toBigNumberStr(amt, 6),
        accountAddress: receiver
    });

    expectTxToSucceed(tx);

    return Transaction.getBankAccountID(tx);
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
