import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfigs } from "../src/DeploymentConfig";
import {
    getProvider,
    getAddressFromSigner,
    getSignerFromSeed,
    getGenesisMap,
    publishPackageUsingClient,
    getDeploymentData
} from "../src/utils";
import { expectTxToSucceed } from "./helpers/expect";
import { OnChainCalls, Transaction } from "../src/classes";
import { ERROR_CODES, OWNERSHIP_ERROR } from "../src/errors";
import { fundTestAccounts } from "./helpers/utils";
import { getTestAccounts } from "./helpers/accounts";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.rpc
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

describe("Roles", () => {
    let onChain: OnChainCalls;
    let ownerAddress: string;

    before(async () => {
        await fundTestAccounts();
        ownerAddress = await getAddressFromSigner(ownerSigner);
    });

    beforeEach(async () => {
        const publishTxn = await publishPackageUsingClient();
        const objects = await getGenesisMap(provider, publishTxn);
        const deploymentData = await getDeploymentData(ownerAddress, objects);
        onChain = new OnChainCalls(ownerSigner, deploymentData);
    });

    describe("Exchange Admin", () => {
        it("should successfully transfer exchange admin role to alice", async () => {
            const alice = getTestAccounts(provider)[0];

            const tx = await onChain.transferExchangeAdmin({
                address: alice.address
            });
            expectTxToSucceed(tx);

            const event = Transaction.getEvents(
                tx,
                "ExchangeAdminUpdateEvent"
            )[0];
            expect(event.fields.account).to.be.equal(alice.address);
        });

        it("should revert when non-admin tries to transfer Exchange Admin role to someone", async () => {
            const alice = getTestAccounts(provider)[0];
            const bob = getTestAccounts(provider)[1];

            const expectedError = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                ownerAddress,
                bob.address
            );

            await expect(
                onChain.transferExchangeAdmin(
                    { address: alice.address },
                    bob.signer
                )
            ).to.eventually.rejectedWith(expectedError);
        });

        it("should revert when trying to transfer ownership of exchange admin ot existing admin", async () => {
            const tx = await onChain.transferExchangeAdmin(
                { address: ownerAddress },
                ownerSigner
            );
            expect(Transaction.getError(tx), ERROR_CODES[900]);
        });
    });

    describe("Settlement Operators", () => {
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
});
