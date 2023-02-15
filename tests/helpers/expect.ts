import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
const expect = chai.expect;

import { SuiExecuteTransactionResponse } from "@mysten/sui.js";
import { Transaction } from "../../src/classes";
import { BASE_DECIMALS, bigNumber } from "../../src/library";

export function expectTxToSucceed(txResponse: SuiExecuteTransactionResponse) {
    const status = Transaction.getStatus(txResponse);
    expect(status).to.be.equal("success");
}

export function expectTxToFail(txResponse: SuiExecuteTransactionResponse) {
    const status = Transaction.getStatus(txResponse);
    expect(status).to.be.equal("failure");
}

export function expectPosition(expectedPosition: any, position: any) {
    // expect(position.isPosPositive).to.be.equal(expectedPosition);
    // expect(bigNumber(position.mro).shiftedBy(-BASE_DECIMALS).toFixed(3)).to.be.equal(string(expectedPosition.mro));
}
