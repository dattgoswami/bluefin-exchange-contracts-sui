import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
export const expect = chai.expect;

import { SuiExecuteTransactionResponse } from "@mysten/sui.js";
import { OnChainCalls, Transaction } from "../../src/classes";
import { TestPositionExpect } from "./interfaces";

export function expectTxToSucceed(txResponse: SuiExecuteTransactionResponse) {
    const status = Transaction.getStatus(txResponse);
    expect(status).to.be.equal("success");
}

export function expectTxToFail(txResponse: SuiExecuteTransactionResponse) {
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

    // TODO once margin bank is implemented remove this if condition
    if (onChainPosition.bankBalance)
        expect(onChainPosition.bankBalance.toFixed(6)).to.be.equal(
            expectedPosition.bankBalance.toFixed(6)
        );
}

export function expectTxToEmitEvent(
    txResponse: SuiExecuteTransactionResponse,
    eventName: string,
    eventsCount: number = 1
) {
    const events = Transaction.getEvents(txResponse, eventName);

    expect(events?.length).to.equal(eventsCount);
    expect(events?.[0]).to.not.be.undefined;
}

export async function evaluateSystemExpect(
    expectedSystemValues: any,
    onChain: OnChainCalls
) {
    if (expectedSystemValues.fee) {
        // const fee = hexToBigNumber(
        //     await contracts.marginbank.getAccountBankBalance(FEE_POOL_ADDRESS)
        // ).shiftedBy(-18);
        // expect(fee.toFixed(6)).to.be.equal(
        //     new BigNumber(expectedSystemValues.fee).toFixed(6)
        // );
    }

    if (expectedSystemValues.insuranceFund) {
        // const insurance = hexToBigNumber(
        //     await contracts.marginbank.getAccountBankBalance(
        //         INSURANCE_POOL_ADDRESS
        //     )
        // ).shiftedBy(-BASE_DECIMALS);
        // expect(insurance.toFixed(6)).to.be.equal(
        //     new BigNumber(expectedSystemValues.IFBalance).toFixed(6)
        // );
    }

    if (expectedSystemValues.perpetualFunds) {
        // const perpetual = hexToBigNumber(
        //     await contracts.marginbank.getAccountBankBalance(
        //         contracts.perpetual.address
        //     )
        // ).shiftedBy(-BASE_DECIMALS);
        // expect(
        //     new BigNumber(expectedSystemValues.perpetual).toFixed(6)
        // ).to.be.equal(perpetual.toFixed(6));
    }
}
