import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfigs } from "../src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getSignerFromSeed,
    createMarket
} from "../src/utils";
import { OnChainCalls, Transaction } from "../src/classes";
import { expectTxToFail, expectTxToSucceed } from "./helpers/expect";
import { getTestAccounts } from "./helpers/accounts";
import { network } from "../src/DeploymentConfig";

chai.use(chaiAsPromised);
const expect = chai.expect;
const provider = getProvider(network.rpc, network.faucet);

describe("Perpetual", () => {
    const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
    const deployment = readFile(DeploymentConfigs.filePath);
    let onChain: OnChainCalls;

    const [alice, bob] = getTestAccounts(provider);

    before(async () => {
        // deploy market
        deployment["markets"] = {
            "ETH-PERP": {
                Objects: (await createMarket(deployment, ownerSigner, provider))
                    .marketObjects
            }
        };
        onChain = new OnChainCalls(ownerSigner, deployment);
    });

    it("should successfully update insurance pool percentage", async () => {
        const txResult = await onChain.setInsurancePoolPercentage({
            percentage: 1
        });
        expectTxToSucceed(txResult);
    });

    it("should not update insurance pool percentage if greater than 1", async () => {
        const txResult = await onChain.setInsurancePoolPercentage({
            percentage: 1.000001
        });
        expectTxToFail(txResult);
        expect(Transaction.getErrorCode(txResult)).to.be.equal(104);
    });

    it("should successfully update max allowed FR", async () => {
        const txResult = await onChain.setMaxAllowedFundingRate({
            maxAllowedFR: 1
        });
        expectTxToSucceed(txResult);
    });

    it("should not update max allowed FR if greater than 1", async () => {
        const txResult = await onChain.setMaxAllowedFundingRate({
            maxAllowedFR: 1.000001
        });
        expectTxToFail(txResult);
        expect(Transaction.getErrorCode(txResult)).to.be.equal(104);
    });

    it("should update insurance pool address", async () => {
        const txResult = await onChain.setInsurancePoolAddress({
            address: bob.address.toString()
        });
        expectTxToSucceed(txResult);
    });

    it("should not update insurance pool address if zero", async () => {
        const txResult = await onChain.setInsurancePoolAddress({
            address: "0x0000000000000000000000000000000000000000"
        });
        expectTxToFail(txResult);
        expect(Transaction.getErrorCode(txResult)).to.be.equal(105);
    });

    it("should update fee pool address", async () => {
        const txResult = await onChain.setFeePoolAddress({
            address: bob.address.toString()
        });
        expectTxToSucceed(txResult);
    });

    it("should not update fee pool address if zero", async () => {
        const txResult = await onChain.setFeePoolAddress({
            address: "0x0000000000000000000000000000000000000000"
        });
        expectTxToFail(txResult);
        expect(Transaction.getErrorCode(txResult)).to.be.equal(105);
    });
});
