import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfigs } from "../submodules/library-sui";
import {
    getProvider,
    getSignerFromSeed,
    getGenesisMap,
    publishPackage,
    getDeploymentData,
    requestGas
} from "../submodules/library-sui";
import { expectTxToFail, expectTxToSucceed } from "./helpers/expect";
import { OnChainCalls, Transaction } from "../submodules/library-sui";
import { ERROR_CODES, OWNERSHIP_ERROR } from "../submodules/library-sui";
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
    const alice = getTestAccounts(provider)[0];
    const bob = getTestAccounts(provider)[1];

    before(async () => {
        await fundTestAccounts();
        ownerAddress = await ownerSigner.getAddress();
    });

    beforeEach(async () => {
        await requestGas(ownerAddress);
        const publishTxn = await publishPackage(false, ownerSigner);
        const objects = await getGenesisMap(provider, publishTxn);
        const deploymentData = await getDeploymentData(ownerAddress, objects);
        onChain = new OnChainCalls(ownerSigner, deploymentData);
    });

    describe("Exchange Admin", () => {
        it("should successfully transfer exchange admin role to alice", async () => {
            const tx = await onChain.setExchangeAdmin({
                address: alice.address
            });
            expectTxToSucceed(tx);

            const event = Transaction.getEvents(
                tx,
                "ExchangeAdminUpdateEvent"
            )[0];
            expect(event.account).to.be.equal(alice.address);
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
                onChain.setExchangeAdmin({ address: alice.address }, bob.signer)
            ).to.eventually.rejectedWith(expectedError);
        });

        it("should revert when trying to transfer ownership of exchange admin to existing admin", async () => {
            const tx = await onChain.setExchangeAdmin(
                { address: ownerAddress, gasBudget: 90000000 },
                ownerSigner
            );
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[900]);
        });
    });

    describe("Exchange Guardian", () => {
        it("should revert when non-exchange admin tries to set guardian", async () => {
            const error = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                onChain.getDeployerAddress(),
                bob.address
            );
            await expect(
                onChain.setExchangeGuardian(
                    { address: alice.address, gasBudget: 900000 },
                    bob.signer
                )
            ).to.be.eventually.rejectedWith(error);
        });

        it("should transfer guardian ship to alice", async () => {
            const tx1 = await onChain.setExchangeGuardian({
                address: alice.address
            });
            expectTxToSucceed(tx1);

            const guardianCap = Transaction.getCreatedObjectIDs(tx1)[0];

            // expect to fail as owner is no longer guardian
            const tx2 = await onChain.setBankWithdrawalStatus(
                { isAllowed: false, gasBudget: 90000000 },
                ownerSigner
            );
            expectTxToFail(tx2);
            expect(Transaction.getError(tx2)).to.be.equal(ERROR_CODES[111]);

            // should fail as alice has its own guardian cap, this guardian cap belongs to the admin/owner
            const error = OWNERSHIP_ERROR(
                onChain.getGuardianCap(),
                onChain.getDeployerAddress(),
                alice.address
            );

            expect(
                onChain.setBankWithdrawalStatus(
                    {
                        isAllowed: false,
                        guardianCap: onChain.getGuardianCap()
                    },
                    alice.signer
                )
            ).to.be.eventually.rejectedWith(error);

            const tx3 = await onChain.setBankWithdrawalStatus(
                { isAllowed: false, guardianCap },
                alice.signer
            );
            expectTxToSucceed(tx3);
        });
    });

    describe("Settlement Operators", () => {
        it("should make owner the settlement operator", async () => {
            const txResponse = await onChain.createSettlementOperator({
                operator: ownerAddress
            });
            expectTxToSucceed(txResponse);
        });

        it("should remove settlement operator", async () => {
            const tx1 = await onChain.createSettlementOperator({
                operator: ownerAddress
            });
            expectTxToSucceed(tx1);

            const capID = Transaction.getCreatedObjectIDs(tx1)[0];

            const tx2 = await onChain.removeSettlementOperator({
                capID: capID
            });

            expectTxToSucceed(tx2);
        });

        it("should revert when trying to remove a non-existent settlement operator", async () => {
            const tx1 = await onChain.createSettlementOperator({
                operator: ownerAddress
            });
            expectTxToSucceed(tx1);

            const capID = Transaction.getCreatedObjectIDs(tx1)[0];

            const tx2 = await onChain.removeSettlementOperator({
                capID: capID
            });

            expectTxToSucceed(tx2);

            const tx3 = await onChain.removeSettlementOperator({
                capID: capID,
                gasBudget: 90000000
            });

            expectTxToFail(tx3);

            expect(Transaction.getError(tx3)).to.be.equal(ERROR_CODES[112]);
        });
    });

    describe("Price Oracle Operator", () => {
        it("should revert when non-exchange admin tries to set price oracle operator", async () => {
            const error = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                onChain.getDeployerAddress(),
                alice.address
            );

            await expect(
                onChain.setPriceOracleOperator(
                    {
                        operator: alice.address
                    },
                    alice.signer
                )
            ).to.be.eventually.rejectedWith(error);
        });

        it("should transfer price oracle operator capability to alice", async () => {
            const tx = await onChain.setPriceOracleOperator({
                operator: alice.address
            });
            expectTxToSucceed(tx);

            const event = Transaction.getEvents(
                tx,
                "PriceOracleOperatorUpdate"
            )[0];

            expect(event.account).to.be.equal(alice.address);
        });
    });

    describe("Funding Rate Operator", () => {
        it("should revert when non-exchange admin tries to set funding rate operator", async () => {
            const error = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                onChain.getDeployerAddress(),
                alice.address
            );

            await expect(
                onChain.setFundingRateOperator(
                    {
                        operator: alice.address
                    },
                    alice.signer
                )
            ).to.be.eventually.rejectedWith(error);
        });

        it("should transfer funding rate operator capability to alice", async () => {
            const tx = await onChain.setFundingRateOperator({
                operator: alice.address
            });
            expectTxToSucceed(tx);

            const event = Transaction.getEvents(
                tx,
                "FundingRateOperatorUpdate"
            )[0];

            expect(event.account).to.be.equal(alice.address);
        });
    });

    describe("Deleveraging Operator", () => {
        it("should revert when non-exchange admin tries to set deleveraging operator", async () => {
            const error = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                onChain.getDeployerAddress(),
                alice.address
            );

            await expect(
                onChain.setDeleveragingOperator(
                    {
                        operator: alice.address
                    },
                    alice.signer
                )
            ).to.be.eventually.rejectedWith(error);
        });

        it("should transfer deleveraging operator capability to alice", async () => {
            const tx = await onChain.setDeleveragingOperator({
                operator: alice.address
            });
            expectTxToSucceed(tx);

            const event = Transaction.getEvents(
                tx,
                "DelevergingOperatorUpdate"
            )[0];

            expect(event.account).to.be.equal(alice.address);
        });
    });

    describe("Sub Accounts", () => {
        it("should allow alice to whitelist bob as its sub account", async () => {
            const tx = await onChain.setSubAccount(
                { account: bob.address, status: true },
                alice.signer
            );
            expectTxToSucceed(tx);

            const event = Transaction.getEvents(tx, "SubAccountUpdateEvent")[0];
            expect(event.account).to.be.equal(alice.address);
            expect(event.subAccount).to.be.equal(bob.address);
            expect(event.status).to.be.equal(true);
        });

        it("should allow alice to remove bob from its sub accounts", async () => {
            const tx1 = await onChain.setSubAccount(
                { account: bob.address, status: true },
                alice.signer
            );
            expectTxToSucceed(tx1);

            const tx2 = await onChain.setSubAccount(
                { account: bob.address, status: false },
                alice.signer
            );
            expectTxToSucceed(tx2);

            const event = Transaction.getEvents(
                tx2,
                "SubAccountUpdateEvent"
            )[0];

            expect(event.account).to.be.equal(alice.address);
            expect(event.subAccount).to.be.equal(bob.address);
            expect(event.status).to.be.equal(false);
        });

        it("should execute tx successfully even when alice tries to remove a non-existent sub account", async () => {
            const tx = await onChain.setSubAccount(
                { account: bob.address, status: false },
                alice.signer
            );
            expectTxToSucceed(tx);

            const event = Transaction.getEvents(tx, "SubAccountUpdateEvent")[0];

            expect(event.account).to.be.equal(alice.address);
            expect(event.subAccount).to.be.equal(bob.address);
            expect(event.status).to.be.equal(false);
        });

        it("should execute tx successfully even when alice tries to whitelist same account as sub account twice", async () => {
            const tx1 = await onChain.setSubAccount(
                { account: bob.address, status: true },
                alice.signer
            );
            expectTxToSucceed(tx1);

            const tx2 = await onChain.setSubAccount(
                { account: bob.address, status: true },
                alice.signer
            );
            expectTxToSucceed(tx2);

            const event = Transaction.getEvents(
                tx2,
                "SubAccountUpdateEvent"
            )[0];

            expect(event.account).to.be.equal(alice.address);
            expect(event.subAccount).to.be.equal(bob.address);
            expect(event.status).to.be.equal(true);
        });
    });
});
