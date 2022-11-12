import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
const expect = chai.expect;

import { SuiExecuteTransactionResponse } from "@mysten/sui.js";
import { getStatus } from "../../src/utils";

export function expectTxToSucceed(txResponse:SuiExecuteTransactionResponse){
    const status = getStatus(txResponse);
    expect(status["status"]).to.be.equal("success");
}

export function expectTxToFail(txResponse:SuiExecuteTransactionResponse){
    const status = getStatus(txResponse);
    expect(status["status"]).to.be.equal("failure");
}