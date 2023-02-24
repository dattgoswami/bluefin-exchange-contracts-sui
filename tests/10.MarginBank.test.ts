import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfigs } from "../src/DeploymentConfig";
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
import { TEST_WALLETS } from "./helpers/accounts";
import { toBigNumberStr } from "../src/library";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.rpc
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
const aliceAddress = TEST_WALLETS[0].address;

describe("MarginBank", () => {
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
            moduleName: "margin_bank",
            objects: objects,
            markets: []
        };
        onChain = new OnChainCalls(ownerSigner, deployment);
    });

    describe("Deposits and Withdraw", () => {
        it("should deposit 10K USDC to margin bank for alice", async () => {
            const receipt = await onChain.mintUSDC(
                {
                    amount: toBigNumberStr("10000", 6),
                    to: aliceAddress
                },
                ownerSigner
            );

            const coins = (await onChain.getUSDCBalance(alice)).data;

            const coin = coins.pop();

            const txResult = await onChain.depositToBank(
                {
                    coinID: coin.coinObjectId
                },
                alice
            );

            const bankBalanceUpdateEvent = Transaction.getEvents(
                txResult,
                "BankBalanceUpdate"
            )[0];

            expect(bankBalanceUpdateEvent).to.not.be.undefined;
            expect(bankBalanceUpdateEvent?.fields?.srcAddress).to.be.equal(
                aliceAddress
            );
            expect(bankBalanceUpdateEvent?.fields?.destAddress).to.be.equal(
                aliceAddress
            );
            expect(bankBalanceUpdateEvent?.fields?.action).to.be.equal("0");
            expect(bankBalanceUpdateEvent?.fields?.amount).to.be.equal(
                toBigNumberStr("10000")
            );
            expect(bankBalanceUpdateEvent?.fields?.destBalance).to.be.equal(
                toBigNumberStr("10000")
            );
        });

        it("should withdraw deposited USDC from margin bank from alice account", async () => {
            const receipt = await onChain.mintUSDC(
                {
                    amount: toBigNumberStr("10000", 6),
                    to: aliceAddress
                },
                ownerSigner
            );

            const coins = (await onChain.getUSDCBalance(alice)).data;

            const coin = coins.pop();

            const depositReceipt = await onChain.depositToBank(
                {
                    coinID: coin.coinObjectId
                },
                alice
            );

            const depositBankBalanceUpdateEvent = Transaction.getEvents(
                depositReceipt,
                "BankBalanceUpdate"
            )[0];

            const coinValue = toBigNumberStr(coin.balance, 3); // converting a 6 decimal coin to 9 decimal value
            expect(depositBankBalanceUpdateEvent).to.not.be.undefined;
            expect(
                depositBankBalanceUpdateEvent?.fields?.destAddress
            ).to.be.equal(aliceAddress);
            expect(
                depositBankBalanceUpdateEvent?.fields?.srcAddress
            ).to.be.equal(aliceAddress);
            expect(depositBankBalanceUpdateEvent?.fields?.action).to.be.equal(
                "0"
            );
            expect(depositBankBalanceUpdateEvent?.fields?.amount).to.be.equal(
                coinValue
            );
            expect(
                depositBankBalanceUpdateEvent?.fields?.srcBalance
            ).to.be.equal(coinValue);

            const txResult = await onChain.withdrawFromBank(
                {
                    amount: coin.balance.toString()
                },
                alice
            );

            const bankBalanceUpdateEvent = Transaction.getEvents(
                txResult,
                "BankBalanceUpdate"
            )[0];

            expect(bankBalanceUpdateEvent).to.not.be.undefined;
            expect(bankBalanceUpdateEvent?.fields?.destAddress).to.be.equal(
                aliceAddress
            );
            expect(bankBalanceUpdateEvent?.fields?.srcAddress).to.be.equal(
                aliceAddress
            );
            expect(bankBalanceUpdateEvent?.fields?.action).to.be.equal("1");
            expect(bankBalanceUpdateEvent?.fields?.amount).to.be.equal(
                coinValue
            );
            expect(bankBalanceUpdateEvent?.fields?.srcBalance).to.be.equal("0");
        });

        it("should revert alice does not have enough funds to withdraw", async () => {
            const txResult = await onChain.withdrawFromBank(
                {
                    amount: toBigNumberStr("10000", 6)
                },
                alice
            );

            expect(Transaction.getStatus(txResult)).to.be.equal("failure");
            expect(Transaction.getErrorCode(txResult)).to.be.equal(603);
        });

        it("should revert when guardian disabled withdraw", async () => {
            const receipt = await onChain.mintUSDC(
                {
                    amount: toBigNumberStr("10000", 6),
                    to: aliceAddress
                },
                ownerSigner
            );

            const coins = (await onChain.getUSDCBalance(alice)).data;

            const coin = coins.pop();

            await onChain.depositToBank(
                {
                    coinID: coin.coinObjectId
                },
                alice
            );

            await onChain.setIsWithdrawalAllowed(
                {
                    isAllowed: false
                },
                ownerSigner
            );

            const txResult = await onChain.withdrawFromBank(
                {
                    amount: toBigNumberStr("1000")
                },
                alice
            );

            expect(Transaction.getStatus(txResult)).to.be.equal("failure");
            expect(Transaction.getErrorCode(txResult)).to.be.equal(604);
        });
    });
});
