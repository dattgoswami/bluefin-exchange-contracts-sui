import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
export const expect = chai.expect;

import { SuiTransactionBlockResponse } from "@mysten/sui.js";
import { TestPositionExpect } from "./interfaces";
import { getExpectedTestPosition, toExpectedPositionFormat } from "./utils";
import {
    Transaction,
    Balance,
    UserPositionExtended,
    OnChainCalls
} from "../../submodules/library-sui";
import BigNumber from "bignumber.js";
import { bigNumber, bnToBaseStr } from "../../submodules/library-sui";
import { Account } from "./accounts";

export function expectTxToSucceed(txResponse: SuiTransactionBlockResponse) {
    const status = Transaction.getStatus(txResponse);
    expect(status).to.be.equal("success");
}

export function expectTxToFail(txResponse: SuiTransactionBlockResponse) {
    const status = Transaction.getStatus(txResponse);
    expect(status).to.be.equal("failure");
}

export function expectPosition(
    onChainPosition: TestPositionExpect,
    expectedPosition: TestPositionExpect
) {
    expect(onChainPosition.isPosPositive).to.be.equal(
        expectedPosition.isPosPositive
    );

    expect(onChainPosition.mro.toFixed(3)).to.be.equal(
        expectedPosition.mro.toFixed(3)
    );

    expect(onChainPosition.oiOpen.toFixed(3)).to.be.equal(
        expectedPosition.oiOpen.toFixed(3)
    );

    expect(onChainPosition.qPos.toFixed(0)).to.be.equal(
        expectedPosition.qPos.toFixed(0)
    );

    expect(onChainPosition.margin.toFixed(3)).to.be.equal(
        expectedPosition.margin.toFixed(3)
    );

    expect(onChainPosition.marginRatio.toFixed(3)).to.be.equal(
        expectedPosition.marginRatio.toFixed(3)
    );

    expect(onChainPosition.pPos.toFixed(3)).to.be.equal(
        expectedPosition.pPos.toFixed(3)
    );

    expect(onChainPosition.pnl.toFixed(3)).to.be.equal(
        expectedPosition.pnl.toFixed(3)
    );

    // we don't get bank balance from tx events if no funds were transferred from user's margin
    if (
        !expectedPosition.bankBalance.eq(0) &&
        !onChainPosition.bankBalance.eq(0)
    ) {
        expect(onChainPosition.bankBalance.toFixed(6)).to.be.equal(
            expectedPosition.bankBalance.toFixed(6)
        );
    }
}

export function expectTxToEmitEvent(
    txResponse: SuiTransactionBlockResponse,
    eventName: string,
    eventsCount = 1,
    emission?: any[]
) {
    const events = Transaction.getEvents(txResponse, eventName);

    expect(events?.length).to.equal(eventsCount);

    if (emission) {
        for (const itr in events) {
            expect(emission[itr]).to.deep.equal(events[itr]);
        }
    }
}

export async function evaluateSystemExpect(
    onChain: OnChainCalls,
    expectedSystemValues: any,
    feePoolAddress: string,
    insurancePoolAddress: string,
    perpetualAddress: string
) {
    if (expectedSystemValues.fee) {
        const feePoolBalance = await onChain.getUserBankBalance(feePoolAddress);
        expect(bnToBaseStr(feePoolBalance)).to.be.equal(
            bigNumber(expectedSystemValues.fee).toFixed(6)
        );
    }

    if (expectedSystemValues.insurancePool) {
        const insurancePoolBalance = await onChain.getUserBankBalance(
            insurancePoolAddress
        );
        expect(bnToBaseStr(insurancePoolBalance)).to.be.equal(
            bigNumber(expectedSystemValues.insurancePool).toFixed(6)
        );
    }

    if (expectedSystemValues.perpetual) {
        const perpetualBalance = await onChain.getUserBankBalance(
            perpetualAddress
        );
        expect(bnToBaseStr(perpetualBalance)).to.be.equal(
            bigNumber(expectedSystemValues.perpetual).toFixed(6)
        );
    }
}

export async function evaluateAccountPositionExpect(
    onChain: OnChainCalls,
    account: Account,
    expectedJSON: any,
    oraclePrice: BigNumber,
    tx: SuiTransactionBlockResponse
) {
    const position = Transaction.getAccountPositionFromEvent(
        tx,
        account.address
    ) as UserPositionExtended;

    const expectedPosition = getExpectedTestPosition(expectedJSON);

    const bankAcctDetails = await onChain.getBankAccountDetailsUsingID(
        account.bankAccountId as string
    );
    const onChainPosition = toExpectedPositionFormat(
        Balance.fromPosition(position),
        oraclePrice,
        {
            pnl:
                expectedJSON.pnl != undefined
                    ? Transaction.getAccountPNL(tx, account.address)
                    : undefined,
            bankBalance: bankAcctDetails?.balance
        }
    );

    expectPosition(onChainPosition, expectedPosition);
}
