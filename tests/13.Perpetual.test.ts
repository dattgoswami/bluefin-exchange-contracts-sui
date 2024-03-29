import { createMarket, getBankTable } from "../src/deployment";
import { postDeployment } from "../src/helpers";
import {
    DeploymentConfigs,
    readFile,
    getProvider,
    getSignerFromSeed,
    createOrder,
    OnChainCalls,
    OrderSigner,
    Trader,
    Transaction,
    getTestAccounts,
    network,
    ADDRESSES,
    toBigNumberStr,
    ERROR_CODES,
    OWNERSHIP_ERROR
} from "../submodules/library-sui";
import {
    expect,
    expectTxToFail,
    expectTxToSucceed,
    mintAndDeposit
} from "./helpers";

const provider = getProvider(network.rpc, network.faucet);

const pythObj = readFile("./pyth/priceInfoObject.json");

describe("Perpetual", () => {
    const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
    const deployment = readFile(DeploymentConfigs.filePath);
    let ownerAddress: string;
    let onChain: OnChainCalls;

    const [alice, bob, cat] = getTestAccounts(provider);

    before(async () => {
        // deploy market
        deployment["markets"]["ETH-PERP"]["Objects"] = await createMarket(
            deployment,
            ownerSigner,
            provider,
            pythObj["ETH-PERP"][process.env.DEPLOY_ON as string]["object_id"],
            {
                tradingStartTime: Date.now() - 1000,
                priceInfoFeedId:
                    pythObj["ETH-PERP"][process.env.DEPLOY_ON as string][
                        "feed_id"
                    ]
            }
        );
        onChain = new OnChainCalls(ownerSigner, deployment);
        ownerAddress = await ownerSigner.getAddress();
    });

    it("should revert when trying to trade/liquidate/deleverage as perpetual start time < current chain time", async () => {
        const localDeployment = { ...deployment };
        const coinPackageId = localDeployment["objects"]["package"]["id"];
        localDeployment["objects"]["Bank"] = await postDeployment(
            ownerSigner,
            localDeployment,
            coinPackageId
        );
        localDeployment["objects"]["BankTable"] = await getBankTable(
            provider,
            localDeployment
        );
        // trade starting time, current time + 1000 seconds
        localDeployment["markets"]["ETH-PERP"]["Objects"] = await createMarket(
            deployment,
            ownerSigner,
            provider,
            pythObj["ETH-PERP"][process.env.DEPLOY_ON as string]["object_id"],
            {
                tradingStartTime: Date.now() + 1000000,
                priceInfoFeedId:
                    pythObj["ETH-PERP"][process.env.DEPLOY_ON as string][
                        "feed_id"
                    ]
            }
        );

        const onChain = new OnChainCalls(ownerSigner, localDeployment);

        // make admin operator
        const tx1 = await onChain.createSettlementOperator({
            operator: ownerAddress
        });
        const settlementCapID = Transaction.getCreatedObjectIDs(tx1)[0];

        const tx2 = await onChain.setDeleveragingOperator({
            operator: ownerAddress
        });

        const deleveragingCapID = Transaction.getCreatedObjectIDs(tx2)[0];

        // ================== trade ==================
        const orderSigner = new OrderSigner(alice.keyPair);

        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            alice.keyPair,
            bob.keyPair,
            createOrder()
        );

        const txTrade = await onChain.trade({
            ...trade,
            settlementCapID,
            gasBudget: 200000000
        });
        expectTxToFail(txTrade);

        expect(Transaction.getError(txTrade)).to.be.equal(ERROR_CODES[56]);

        // ================== liquidate ==================

        const txLiquidate = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(1),
                leverage: toBigNumberStr(1),
                allOrNothing: true,
                liquidator: ownerAddress, // owner is the liquidator
                gasBudget: 200000000
            },
            ownerSigner
        );

        expectTxToFail(txLiquidate);

        expect(Transaction.getError(txLiquidate)).to.be.equal(ERROR_CODES[56]);

        // ================== deleverage ==================

        const txDeleverage = await onChain.deleverage(
            {
                maker: alice.address,
                taker: alice.address,
                quantity: toBigNumberStr(1),
                gasBudget: 200000000,
                deleveragingCapID
            },
            ownerSigner
        );

        expectTxToFail(txDeleverage);

        expect(Transaction.getError(txDeleverage)).to.be.equal(ERROR_CODES[56]);
    });

    it("should successfully update insurance pool percentage", async () => {
        const txResult = await onChain.setInsurancePoolPercentage({
            percentage: 1
        });
        expectTxToSucceed(txResult);
    });

    it("should not update insurance pool percentage if greater than 1", async () => {
        const txResult = await onChain.setInsurancePoolPercentage({
            percentage: 1.000001,
            gasBudget: 2000000
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
            address: ADDRESSES.ZERO,
            gasBudget: 20000000
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
            address: ADDRESSES.ZERO,
            gasBudget: 20000000
        });
        expectTxToFail(txResult);
        expect(Transaction.getErrorCode(txResult)).to.be.equal(105);
    });

    describe("Changing IMR/MMR", async () => {
        it("should revert when trying to set mmr to zero", async () => {
            const txResult = await onChain.setMaintenanceMarginRequired({
                mmr: toBigNumberStr(0),
                gasBudget: 20000000
            });
            expectTxToFail(txResult);
            expect(Transaction.getErrorCode(txResult)).to.be.equal(300);
        });

        it("should revert when trying to set mmr > imr", async () => {
            const txResult = await onChain.setMaintenanceMarginRequired({
                mmr: toBigNumberStr(0.9),
                gasBudget: 20000000
            });
            expectTxToFail(txResult);
            expect(Transaction.getErrorCode(txResult)).to.be.equal(301);
        });

        it("should revert when trying to set imr < mmr", async () => {
            const txResult = await onChain.setInitialMarginRequired({
                imr: toBigNumberStr(0.01),
                gasBudget: 20000000
            });
            expectTxToFail(txResult);
            expect(Transaction.getErrorCode(txResult)).to.be.equal(302);
        });

        it("should set mmr to 0.0295", async () => {
            const txResult = await onChain.setMaintenanceMarginRequired({
                mmr: toBigNumberStr(0.0295),
                gasBudget: 20000000
            });
            expectTxToSucceed(txResult);
        });

        it("should set imr to 0.046", async () => {
            const txResult = await onChain.setInitialMarginRequired({
                imr: toBigNumberStr(0.046),
                gasBudget: 20000000
            });
            expectTxToSucceed(txResult);
        });
    });

    describe("Delist Perpetual", () => {
        beforeEach(async () => {
            // deploy market
            deployment["markets"]["ETH-PERP"]["Objects"] = await createMarket(
                deployment,
                ownerSigner,
                provider,
                pythObj["ETH-PERP"][process.env.DEPLOY_ON as string][
                    "object_id"
                ],
                {
                    tickSize: toBigNumberStr(0.1),
                    tradingStartTime: Date.now() - 1000,
                    priceInfoFeedId:
                        pythObj["ETH-PERP"][process.env.DEPLOY_ON as string][
                            "feed_id"
                        ]
                }
            );

            onChain = new OnChainCalls(ownerSigner, deployment);
        });

        it("should successfully delist perpetual", async () => {
            const tx = await onChain.delistPerpetual({
                price: toBigNumberStr(100)
            });
            expectTxToSucceed(tx);
        });

        it("should revert as perpetual is already de-listed", async () => {
            const tx1 = await onChain.delistPerpetual({
                price: toBigNumberStr(100)
            });
            expectTxToSucceed(tx1);

            const tx2 = await onChain.delistPerpetual({
                price: toBigNumberStr(100),
                gasBudget: 20000000
            });
            expectTxToFail(tx2);

            expect(Transaction.getError(tx2)).to.be.equal(ERROR_CODES[60]);
        });

        it("should revert as de-listing price does not conform to tick size", async () => {
            const tx = await onChain.delistPerpetual({
                price: toBigNumberStr(100.234),
                gasBudget: 20000000
            });
            expectTxToFail(tx);

            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[5]);
        });

        it("should revert as only exchange admin can de list perpetual", async () => {
            const error = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                onChain.getDeployerAddress(),
                alice.address
            );

            await expect(
                onChain.delistPerpetual(
                    { price: toBigNumberStr(100.234) },
                    alice.signer
                )
            ).to.be.eventually.rejectedWith(error);
        });

        it("should revert as trade can not be performed once perpetual is de-listed", async () => {
            // delist perpetual
            const tx = await onChain.delistPerpetual({
                price: toBigNumberStr(100)
            });
            expectTxToSucceed(tx);

            // make owner, the settlement operator
            const txs = await onChain.createSettlementOperator(
                { operator: onChain.getDeployerAddress() },
                ownerSigner
            );

            const settlementCapID = Transaction.getCreatedObjectIDs(txs)[0];

            const order = createOrder({
                market: onChain.getPerpetualID(),
                isBuy: true,
                maker: alice.address,
                price: 100,
                leverage: 10,
                quantity: 1
            });

            // open a position at 10x leverage between
            const trade = await Trader.setupNormalTrade(
                provider,
                new OrderSigner(alice.keyPair),
                alice.keyPair,
                bob.keyPair,
                order
            );
            const tx2 = await onChain.trade({
                ...trade,
                settlementCapID,
                gasBudget: 20000000
            });
            expectTxToFail(tx2);

            expect(Transaction.getError(tx2)).to.be.equal(ERROR_CODES[61]);
        });

        it("should revert as position can only be closed once perpetual is de-listed", async () => {
            const tx = await onChain.closePosition({ gasBudget: 2000000 });
            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[62]);
        });

        it("should revert as cat has no position to close", async () => {
            await onChain.delistPerpetual({ price: toBigNumberStr(100) });

            const tx = await onChain.closePosition(
                { gasBudget: 20000000 },
                cat.signer
            );
            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[507]);
        });

        it("should successfully close alice's position after perpetual is de-listed", async () => {
            await mintAndDeposit(onChain, alice.address);
            await mintAndDeposit(onChain, bob.address);

            // make owner, the settlement operator
            const txs = await onChain.createSettlementOperator(
                { operator: onChain.getDeployerAddress() },
                ownerSigner
            );

            const settlementCapID = Transaction.getCreatedObjectIDs(txs)[0];

            const priceTx = await onChain.setOraclePrice({
                price: 100
            });

            expectTxToSucceed(priceTx);

            const order = createOrder({
                market: onChain.getPerpetualID(),
                isBuy: true,
                maker: alice.address,
                price: 100,
                leverage: 10,
                quantity: 1
            });

            // open a position at 10x leverage between
            const trade = await Trader.setupNormalTrade(
                provider,
                new OrderSigner(alice.keyPair),
                alice.keyPair,
                bob.keyPair,
                order
            );

            const tx1 = await onChain.trade({ ...trade, settlementCapID });
            expectTxToSucceed(tx1);

            // delist perp
            await onChain.delistPerpetual({ price: toBigNumberStr(100) });

            const tx2 = await onChain.closePosition({}, alice.signer);
            expectTxToSucceed(tx2);
        });

        it("should allow guardian to toggle trading on a perpetual", async () => {
            // make admin operator
            const tx2 = await onChain.createSettlementOperator(
                { operator: ownerAddress },
                ownerSigner
            );
            const settlementCapID = Transaction.getCreatedObjectIDs(tx2)[0];

            const defaultOrder = createOrder({
                isBuy: true,
                maker: alice.address,
                market: onChain.getPerpetualID()
            });

            const tx1 = await onChain.setPerpetualTradingPermit(
                {
                    isPermitted: false
                },
                ownerSigner
            );
            expectTxToSucceed(tx1);

            await mintAndDeposit(onChain, alice.address, 2000);
            await mintAndDeposit(onChain, bob.address, 2000);

            const priceTx = await onChain.setOraclePrice({
                price: 1
            });

            expectTxToSucceed(priceTx);

            const trade = await Trader.setupNormalTrade(
                provider,
                new OrderSigner(alice.keyPair),
                alice.keyPair,
                bob.keyPair,
                defaultOrder
            );

            const txTrade = await onChain.trade({
                ...trade,
                settlementCapID,
                gasBudget: 20000000
            });
            expectTxToFail(txTrade);

            const tx3 = await onChain.setPerpetualTradingPermit(
                {
                    isPermitted: true
                },
                ownerSigner
            );
            expectTxToSucceed(tx3);

            const txTrade2 = await onChain.trade({ ...trade, settlementCapID });
            expectTxToSucceed(txTrade2);
        });
    });

    it("should revert when trying to trade/liquidate/deleverage as trading has been stopped on the perpetual", async () => {
        const localDeployment = { ...deployment };
        const coinPackageId = localDeployment["objects"]["package"]["id"];
        localDeployment["objects"]["Bank"] = await postDeployment(
            ownerSigner,
            localDeployment,
            coinPackageId
        );
        localDeployment["objects"]["BankTable"] = await getBankTable(
            provider,
            localDeployment
        );
        localDeployment["markets"]["ETH-PERP"]["Objects"] = await createMarket(
            deployment,
            ownerSigner,
            provider,
            pythObj["ETH-PERP"][process.env.DEPLOY_ON as string]["object_id"],
            {
                tradingStartTime: Date.now() - 10000,
                priceInfoFeedId:
                    pythObj["ETH-PERP"][process.env.DEPLOY_ON as string][
                        "feed_id"
                    ]
            }
        );

        const onChain = new OnChainCalls(ownerSigner, localDeployment);

        // make admin operator
        const tx1 = await onChain.createSettlementOperator({
            operator: ownerAddress
        });
        const settlementCapID = Transaction.getCreatedObjectIDs(tx1)[0];

        const tx2 = await onChain.setDeleveragingOperator({
            operator: ownerAddress
        });

        const deleveragingCapID = Transaction.getCreatedObjectIDs(tx2)[0];

        // stop trading on perpetual
        const tx = await onChain.setPerpetualTradingPermit({
            isPermitted: false
        });
        expectTxToSucceed(tx);

        // ================== trade ==================
        const orderSigner = new OrderSigner(alice.keyPair);

        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            alice.keyPair,
            bob.keyPair,
            createOrder()
        );

        const txTrade = await onChain.trade({
            ...trade,
            settlementCapID,
            gasBudget: 200000000
        });
        expectTxToFail(txTrade);

        expect(Transaction.getError(txTrade)).to.be.equal(ERROR_CODES[63]);

        // ================== liquidate ==================

        const txLiquidate = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(1),
                leverage: toBigNumberStr(1),
                allOrNothing: true,
                liquidator: ownerAddress, // owner is the liquidator
                gasBudget: 200000000
            },
            ownerSigner
        );

        expectTxToFail(txLiquidate);

        expect(Transaction.getError(txLiquidate)).to.be.equal(ERROR_CODES[63]);

        // ================== deleverage ==================

        const txDeleverage = await onChain.deleverage(
            {
                maker: alice.address,
                taker: alice.address,
                quantity: toBigNumberStr(1),
                gasBudget: 200000000,
                deleveragingCapID
            },
            ownerSigner
        );

        expectTxToFail(txDeleverage);

        expect(Transaction.getError(txDeleverage)).to.be.equal(ERROR_CODES[63]);
    });

    describe("Sub account adjusting parent's position", () => {
        let settlementCapID: string;

        before(async () => {
            // deploy market
            deployment["markets"]["ETH-PERP"]["Objects"] = await createMarket(
                deployment,
                ownerSigner,
                provider,
                pythObj["ETH-PERP"][process.env.DEPLOY_ON as string][
                    "object_id"
                ],
                {
                    tickSize: toBigNumberStr(0.1),
                    tradingStartTime: Date.now() - 1000,
                    priceInfoFeedId:
                        pythObj["ETH-PERP"][process.env.DEPLOY_ON as string][
                            "feed_id"
                        ]
                }
            );

            onChain = new OnChainCalls(ownerSigner, deployment);

            // make admin operator
            const tx2 = await onChain.createSettlementOperator(
                { operator: ownerAddress },
                ownerSigner
            );

            settlementCapID = Transaction.getCreatedObjectIDs(tx2)[0];

            // set oracle price
            const priceTx = await onChain.setOraclePrice({
                price: 100
            });

            expectTxToSucceed(priceTx);

            await mintAndDeposit(onChain, alice.address, 10000);
            await mintAndDeposit(onChain, bob.address, 10000);

            const orderSigner = new OrderSigner(alice.keyPair);

            const order = createOrder({
                market: onChain.getPerpetualID(),
                maker: alice.address,
                isBuy: true,
                price: 100,
                leverage: 10,
                quantity: 1
            });

            // open a position at 10x leverage between alice and bob
            const trade = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                order
            );
            const tx = await onChain.trade({ ...trade, settlementCapID });
            expectTxToSucceed(tx);

            // make cat sub account for alice
            const tx3 = await onChain.setSubAccount(
                { account: cat.address, status: true },
                alice.signer
            );
            expectTxToSucceed(tx3);
        });

        it("should allow cat to add margin to alice's position", async () => {
            const tx = await onChain.addMargin(
                { amount: 10, account: alice.address },
                cat.signer
            );
            expectTxToSucceed(tx);
        });

        it("should allow cat to remove margin from alice's position", async () => {
            const tx1 = await onChain.addMargin(
                { amount: 10, account: alice.address },
                cat.signer
            );
            expectTxToSucceed(tx1);

            const tx = await onChain.removeMargin(
                { amount: 10, account: alice.address, gasBudget: 200000000 },
                cat.signer
            );
            expectTxToSucceed(tx);
        });

        it("should allow cat to adjust alice's leverage", async () => {
            const tx = await onChain.adjustLeverage(
                { leverage: 2, account: alice.address },
                cat.signer
            );
            expectTxToSucceed(tx);
        });

        it("should revert while adjusting margin/leverage as cat is no longer alice's sub-account", async () => {
            // alice remove's cat from sub account list
            const tx = await onChain.setSubAccount(
                { account: cat.address, status: false },
                alice.signer
            );
            expectTxToSucceed(tx);

            expectTxToFail(
                await onChain.addMargin(
                    { amount: 10, account: alice.address, gasBudget: 20000000 },
                    cat.signer
                )
            );
            expectTxToFail(
                await onChain.removeMargin(
                    { amount: 10, account: alice.address, gasBudget: 20000000 },
                    cat.signer
                )
            );
            expectTxToFail(
                await onChain.adjustLeverage(
                    {
                        leverage: 2,
                        account: alice.address,
                        gasBudget: 20000000
                    },
                    cat.signer
                )
            );
        });
    });

    describe("Special Fee tiers", () => {
        it("should allow owner to set special fee tier for an account", async () => {
            const tx = await onChain.setSpecialFee({
                marketName: "ETH-PERP",
                account: alice.address,
                status: true,
                makerFee: 0,
                takerFee: 0.025
            });

            expectTxToSucceed(tx);
        });

        it("should revert when non admin tries to set a special fee tier", async () => {
            // should fail as alice has its own guardian cap, this guardian cap belongs to the admin/owner
            const error = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                onChain.getDeployerAddress(),
                alice.address
            );

            expect(
                onChain.setSpecialFee(
                    {
                        marketName: "ETH-PERP",
                        account: alice.address,
                        status: true,
                        makerFee: 0,
                        takerFee: 0.025
                    },
                    alice.signer
                )
            ).to.be.eventually.rejectedWith(error);
        });

        it("should charge alice zero maker fee due to special fee tier", async () => {
            // make admin operator
            const txOp = await onChain.createSettlementOperator(
                { operator: ownerAddress },
                ownerSigner
            );

            const settlementCapID = Transaction.getCreatedObjectIDs(txOp)[0];

            const tx = await onChain.setSpecialFee({
                marketName: "ETH-PERP",
                account: alice.address,
                status: true,
                makerFee: 0,
                takerFee: 0.025
            });

            expectTxToSucceed(tx);

            await mintAndDeposit(onChain, alice.address, 2000);
            await mintAndDeposit(onChain, bob.address, 2000);

            const priceTx = await onChain.setOraclePrice({
                price: 100
            });

            expectTxToSucceed(priceTx);

            const orderSigner = new OrderSigner(alice.keyPair);

            const defaultOrder = createOrder({
                price: 100,
                quantity: 1,
                isBuy: true,
                maker: alice.address,
                market: onChain.getPerpetualID()
            });

            const trade = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                defaultOrder
            );
            const tx2 = await onChain.trade({ ...trade, settlementCapID });
            expectTxToSucceed(tx2);

            const event = Transaction.getEvents(tx2, "TradeExecuted")[0];
            expect(event.makerFee).to.be.equal("0");
        });
    });
});
