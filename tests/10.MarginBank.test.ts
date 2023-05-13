import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfigs } from "../src/DeploymentConfig";
import {
    getProvider,
    getSignerFromSeed,
    getGenesisMap,
    publishPackageUsingClient
} from "../src/utils";
import { OnChainCalls, Transaction } from "../src/classes";
import { fundTestAccounts } from "./helpers/utils";
import { TEST_WALLETS } from "./helpers/accounts";
import { toBigNumberStr } from "../src/library";
import { expectTxToSucceed } from "./helpers/expect";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.rpc
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
const aliceAddress = TEST_WALLETS[0].address;

describe("Margin Bank", () => {
    let onChain: OnChainCalls;
    let ownerAddress: string;

    before(async () => {
        await fundTestAccounts();
        ownerAddress = await ownerSigner.getAddress();
    });

    beforeEach(async () => {
        const publishTxn = await publishPackageUsingClient();
        const objects = await getGenesisMap(provider, publishTxn);
        const deployment = {
            deployer: ownerAddress,
            objects: objects
        };
        onChain = new OnChainCalls(ownerSigner, deployment);
    });

    describe("Deposits and Withdraw", () => {
        it("should deposit 10K USDC to margin bank for alice", async () => {
            let coins = { data: [] };
            while (coins.data.length == 0) {
                const tx = await onChain.mintUSDC({
                    amount: toBigNumberStr(20000, 6),
                    to: aliceAddress
                });
                expectTxToSucceed(tx);
                coins = await onChain.getUSDCCoins({ address: aliceAddress });
            }

            const coin = coins.data.pop();

            const txResult = await onChain.depositToBank(
                {
                    coinID: (coin as any).coinObjectId,
                    amount: toBigNumberStr("10000", 6)
                },
                alice
            );

            expectTxToSucceed(txResult);

            const bankBalanceUpdateEvent = Transaction.getEvents(
                txResult,
                "BankBalanceUpdate"
            )[0];

            expect(bankBalanceUpdateEvent).to.not.be.undefined;
            expect(bankBalanceUpdateEvent.srcAddress).to.be.equal(aliceAddress);
            expect(bankBalanceUpdateEvent.destAddress).to.be.equal(
                aliceAddress
            );
            expect(bankBalanceUpdateEvent.action).to.be.equal("0");
            expect(bankBalanceUpdateEvent.amount).to.be.equal(
                toBigNumberStr("10000")
            );
            expect(bankBalanceUpdateEvent.destBalance).to.be.equal(
                toBigNumberStr("10000")
            );
        });

        it("should withdraw deposited USDC from margin bank from alice account", async () => {
            let coins = { data: [] };
            while (coins.data.length == 0) {
                const tx = await onChain.mintUSDC({
                    amount: toBigNumberStr(10000, 6),
                    to: aliceAddress
                });
                expectTxToSucceed(tx);
                coins = await onChain.getUSDCCoins({ address: aliceAddress });
            }
            const coin = coins.data.pop();

            const depositReceipt = await onChain.depositToBank(
                {
                    coinID: (coin as any).coinObjectId,
                    amount: toBigNumberStr("10000", 6)
                },
                alice
            );

            const depositBankBalanceUpdateEvent = Transaction.getEvents(
                depositReceipt,
                "BankBalanceUpdate"
            )[0];

            const coinValue = toBigNumberStr((coin as any).balance, 3); // converting a 6 decimal coin to 9 decimal value
            expect(depositBankBalanceUpdateEvent).to.not.be.undefined;
            expect(depositBankBalanceUpdateEvent?.destAddress).to.be.equal(
                aliceAddress
            );
            expect(depositBankBalanceUpdateEvent?.srcAddress).to.be.equal(
                aliceAddress
            );
            expect(depositBankBalanceUpdateEvent?.action).to.be.equal("0");
            expect(depositBankBalanceUpdateEvent?.amount).to.be.equal(
                coinValue
            );
            expect(depositBankBalanceUpdateEvent?.srcBalance).to.be.equal(
                coinValue
            );

            const txResult = await onChain.withdrawFromBank(
                {
                    amount: (coin as any).balance.toString()
                },
                alice
            );

            expectTxToSucceed(txResult);

            const bankBalanceUpdateEvent = Transaction.getEvents(
                txResult,
                "BankBalanceUpdate"
            )[0];

            expect(bankBalanceUpdateEvent).to.not.be.undefined;
            expect(bankBalanceUpdateEvent?.destAddress).to.be.equal(
                aliceAddress
            );
            expect(bankBalanceUpdateEvent?.srcAddress).to.be.equal(
                aliceAddress
            );
            expect(bankBalanceUpdateEvent?.action).to.be.equal("1");
            expect(bankBalanceUpdateEvent?.amount).to.be.equal(coinValue);
            expect(bankBalanceUpdateEvent?.srcBalance).to.be.equal("0");
        });

        it("should revert alice does not have enough funds to withdraw", async () => {
            // empty alice's account
            await onChain.withdrawAllMarginFromBank(alice, 1000000);

            let coins = { data: [] };
            while (coins.data.length == 0) {
                // TODO: figure out why coins are not minted in first call?
                const tx = await onChain.mintUSDC({
                    amount: toBigNumberStr(20000, 6),
                    to: aliceAddress
                });
                expectTxToSucceed(tx);
                coins = await onChain.getUSDCCoins({ address: aliceAddress });
            }

            const coin = (coins.data as any).pop();

            await onChain.depositToBank(
                {
                    coinID: coin.coinObjectId,
                    amount: toBigNumberStr("10000", 6)
                },
                alice
            );

            const txResult = await onChain.withdrawFromBank(
                {
                    amount: toBigNumberStr("50000", 6),
                    gasBudget: 10000000
                },
                alice
            );

            expect(Transaction.getStatus(txResult)).to.be.equal("failure");
            expect(Transaction.getErrorCode(txResult)).to.be.equal(603);
        });

        it("should revert as alice has no bank account", async () => {
            const txResult = await onChain.withdrawFromBank(
                {
                    amount: toBigNumberStr("10000", 6),
                    gasBudget: 10000000
                },
                alice
            );

            expect(Transaction.getStatus(txResult)).to.be.equal("failure");
            expect(Transaction.getErrorCode(txResult)).to.be.equal(605);
        });
    });
});
