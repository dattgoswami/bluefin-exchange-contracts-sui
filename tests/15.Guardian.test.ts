import {
    DeploymentConfigs,
    getProvider,
    getSignerFromSeed,
    getGenesisMap,
    createMarket,
    packDeploymentData,
    getTestAccounts,
    TEST_WALLETS,
    toBigNumberStr,
    OnChainCalls,
    Transaction,
    packageName
} from "../submodules/library-sui";
import {
    expectTxToEmitEvent,
    expectTxToSucceed,
    expect,
    fundTestAccounts
} from "./helpers";

import { publishPackage } from "../src/helpers";

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.rpc
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

describe("Guardian", () => {
    let onChain: OnChainCalls;
    let ownerAddress: string;

    before(async () => {
        await fundTestAccounts();
        ownerAddress = await ownerSigner.getAddress();
    });

    beforeEach(async () => {
        const publishTxn = await publishPackage(
            false,
            ownerSigner,
            packageName
        );
        const objects = await getGenesisMap(provider, publishTxn);
        const deployment = packDeploymentData(ownerAddress, objects);
        const enrichedDeployment = {
            ...deployment,
            markets: {
                ["ETH-PERP"]: {
                    Objects: await createMarket(
                        deployment,
                        ownerSigner,
                        provider,
                        {
                            tradingStartTime: Date.now() - 1000
                        }
                    )
                }
            }
        };
        onChain = new OnChainCalls(ownerSigner, enrichedDeployment);
    });

    it("should successfully toggle WithdrawalStatusUpdate", async () => {
        const tx1 = await onChain.setBankWithdrawalStatus(
            {
                isAllowed: false
            },
            ownerSigner
        );
        expectTxToSucceed(tx1);
        expectTxToEmitEvent(tx1, "WithdrawalStatusUpdate", 1, [
            { status: false }
        ]);

        const tx2 = await onChain.setBankWithdrawalStatus(
            {
                isAllowed: true
            },
            ownerSigner
        );
        expectTxToSucceed(tx2);
        expectTxToEmitEvent(tx2, "WithdrawalStatusUpdate", 1, [
            { status: true }
        ]);
    });
    it("should revert when guardian disabled withdraw", async () => {
        const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
        const aliceAddress = TEST_WALLETS[0].address;
        let coins = { data: [] };
        while (coins.data.length == 0) {
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

        const tx = await onChain.setBankWithdrawalStatus(
            {
                isAllowed: false
            },
            ownerSigner
        );

        expectTxToSucceed(tx);
        expectTxToEmitEvent(tx, "WithdrawalStatusUpdate", 1, [
            { status: false }
        ]);

        const txResult = await onChain.withdrawFromBank(
            {
                amount: toBigNumberStr("1000"),
                gasBudget: 9000000
            },
            alice
        );

        expect(Transaction.getStatus(txResult)).to.be.equal("failure");
        expect(Transaction.getErrorCode(txResult)).to.be.equal(604);
    });
    it("should revert when an old guardian tries to start withdraw", async () => {
        // current guardian sets withdrawal to false
        const tx1 = await onChain.setBankWithdrawalStatus(
            {
                isAllowed: false
            },
            ownerSigner
        );

        expectTxToSucceed(tx1);
        expectTxToEmitEvent(tx1, "WithdrawalStatusUpdate", 1, [
            { status: false }
        ]);

        // making alice new guardian
        const alice = getTestAccounts(provider)[0];
        const tx2 = await onChain.setExchangeGuardian({
            address: alice.address
        });
        const aliceGuardCap = Transaction.getCreatedObjectIDs(tx2)[0];

        // old guardian trying to turn on withdrawal
        const tx3 = await onChain.setBankWithdrawalStatus(
            {
                isAllowed: true,
                gasBudget: 9000000
            },
            ownerSigner
        );

        expect(Transaction.getErrorCode(tx3)).to.be.equal(111);

        const tx4 = await onChain.setBankWithdrawalStatus(
            {
                isAllowed: true,
                guardianCap: aliceGuardCap
            },
            alice.signer
        );

        expectTxToSucceed(tx4);
        expectTxToEmitEvent(tx4, "WithdrawalStatusUpdate", 1, [
            { status: true }
        ]);
    });
    it("should successfully toggle TradingPermissionStatusUpdate", async () => {
        const tx1 = await onChain.setPerpetualTradingPermit(
            {
                isPermitted: false
            },
            ownerSigner
        );
        expectTxToSucceed(tx1);
        expectTxToEmitEvent(tx1, "TradingPermissionStatusUpdate", 1, [
            { status: false }
        ]);

        const tx2 = await onChain.setPerpetualTradingPermit(
            {
                isPermitted: true
            },
            ownerSigner
        );
        expectTxToSucceed(tx2);
        expectTxToEmitEvent(tx2, "TradingPermissionStatusUpdate", 1, [
            { status: true }
        ]);
    });
    it("should revert when an old guardian tries to deny trading", async () => {
        // current guardian denies permission
        const tx1 = await onChain.setPerpetualTradingPermit(
            {
                isPermitted: false
            },
            ownerSigner
        );
        expectTxToSucceed(tx1);
        expectTxToEmitEvent(tx1, "TradingPermissionStatusUpdate", 1, [
            { status: false }
        ]);

        // making alice new guardian
        const alice = getTestAccounts(provider)[0];
        const tx2 = await onChain.setExchangeGuardian({
            address: alice.address
        });
        const aliceGuardCap = Transaction.getCreatedObjectIDs(tx2)[0];

        // old guardian trying to turn off trading
        const tx3 = await onChain.setPerpetualTradingPermit(
            {
                isPermitted: false,
                gasBudget: 9000000
            },
            ownerSigner
        );

        expect(Transaction.getErrorCode(tx3)).to.be.equal(111);

        const tx4 = await onChain.setPerpetualTradingPermit(
            {
                isPermitted: true,
                guardianCap: aliceGuardCap
            },
            alice.signer
        );

        expectTxToSucceed(tx4);
        expectTxToEmitEvent(tx4, "TradingPermissionStatusUpdate", 1, [
            { status: true }
        ]);
    });
});
