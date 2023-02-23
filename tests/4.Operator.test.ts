import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfigs } from "../src/DeploymentConfig";
import {
    getProvider,
    getSignerSUIAddress,
    getSignerFromSeed,
    getCreatedObjects,
    publishPackageUsingClient,
    getDeploymentData
} from "../src/utils";
import { expectTxToSucceed } from "./helpers/expect";
import { OnChainCalls, Transaction } from "../src/classes";
import { ERROR_CODES } from "../src/errors";
import { fundTestAccounts } from "./helpers/utils";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.rpc
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

describe("Operators", () => {
    let onChain: OnChainCalls;
    let ownerAddress: string;

    before(async () => {
        await fundTestAccounts();
        ownerAddress = await getSignerSUIAddress(ownerSigner);
    });

    beforeEach(async () => {
        const publishTxn = await publishPackageUsingClient();
        const objects = await getCreatedObjects(provider, publishTxn);
        const deploymentData = await getDeploymentData(ownerAddress, objects);
        onChain = new OnChainCalls(ownerSigner, deploymentData);
    });

    it("should set owner as settlement operator", async () => {
        const txResponse = await onChain.setSettlementOperator({
            operator: ownerAddress,
            status: true
        });
        expectTxToSucceed(txResponse);
    });

    it("should remove settlement operator", async () => {
        const txResponse = await onChain.setSettlementOperator({
            operator: ownerAddress,
            status: true
        });
        expectTxToSucceed(txResponse);

        const tx = await onChain.setSettlementOperator({
            operator: ownerAddress,
            status: false
        });
        expectTxToSucceed(tx);
    });

    it("should revert when trying to add an already existing operator", async () => {
        const txResponse = await onChain.setSettlementOperator({
            operator: ownerAddress,
            status: true
        });
        expectTxToSucceed(txResponse);

        const tx = await onChain.setSettlementOperator({
            operator: ownerAddress,
            status: true
        });
        expect(Transaction.getError(tx), ERROR_CODES[7]);
    });

    it("should revert when trying to remove a non-existing operator", async () => {
        const tx = await onChain.setSettlementOperator({
            operator: ownerAddress,
            status: false
        });
        expect(Transaction.getError(tx), ERROR_CODES[8]);
    });
});
