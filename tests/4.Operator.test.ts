import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfig } from "../src/DeploymentConfig";
import {
    getProvider,
    getSignerSUIAddress,
    getSignerFromSeed,
    getCreatedObjects,
    publishPackageUsingClient
} from "../src/utils";
import { expectTxToSucceed } from "./helpers/expect";
import { OnChainCalls, Transaction } from "../src/classes";
import { ERROR_CODES } from "../src/errors";
import { fundTestAccounts } from "./helpers/utils";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfig.network.rpc,
    DeploymentConfig.network.rpc
);
const ownerSigner = getSignerFromSeed(DeploymentConfig.deployer, provider);

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
        const deployment = {
            deployer: ownerAddress,
            moduleName: "perpetual",
            objects: objects,
            markets: []
        };
        onChain = new OnChainCalls(ownerSigner, deployment);
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
