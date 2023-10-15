import {
    DeploymentConfigs,
    readFile,
    getProvider,
    getSignerFromSeed,
    createOrder,
    requestGas,
    OnChainCalls,
    OrderSigner,
    Transaction,
    ERROR_CODES,
    toBigNumberStr,
    Trader,
    network,
    Order,
    UserPositionExtended,
    getTestAccounts,
    BASE_DECIMALS_ON_CHAIN
} from "../submodules/library-sui";
import { createMarket } from "../src/deployment";

import { getMakerTakerAccounts } from "./helpers/accounts";

import {
    expectTxToFail,
    expectTxToSucceed,
    expect,
    mintAndDeposit
} from "./helpers";

const provider = getProvider(network.rpc, network.faucet);
const deployment = readFile(DeploymentConfigs.filePath);

const pythObj = readFile("./pyth/priceInfoObject.json");

describe("Liquidation Trade Method", () => {
    const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
    let onChain: OnChainCalls;
    let ownerAddress: string;
    let settlementCapID: string;

    const [alice, bob] = getTestAccounts(provider);

    const orderSigner = new OrderSigner(alice.keyPair);

    let order: Order;

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

        // will be using owner as liquidator
        ownerAddress = await ownerSigner.getAddress();

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

        await mintAndDeposit(onChain, alice.address);
        await mintAndDeposit(onChain, bob.address);
        await mintAndDeposit(onChain, ownerAddress);

        order = createOrder({
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
    });

    beforeEach(async () => {
        await onChain.setOraclePrice({
            price: 100
        });
    });

    it("should revert as sender of the trade is not the same as liquidator", async () => {
        const txResponse = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(1),
                leverage: toBigNumberStr(1),
                liquidator: bob.address, // liquidator is bob
                gasBudget: 90000000
            },
            ownerSigner
        ); // caller is owner

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[51]);
    });

    it("should revert as quantity to be liquidated < min allowed quantity ", async () => {
        const txResponse = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(0.01), // min quantity tradeable is 0.1
                leverage: toBigNumberStr(1),
                liquidator: ownerAddress, // owner is the liquidator
                gasBudget: 90000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[19]);
    });

    it("should revert as quantity to be liquidated > max allowed limit quantity", async () => {
        const txResponse = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(500000), // max quantity tradeable for limit order is 100000
                leverage: toBigNumberStr(1),
                liquidator: ownerAddress, // owner is the liquidator
                gasBudget: 90000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[20]);
    });

    it("should revert as quantity to be liquidated > max allowed market order size", async () => {
        const txResponse = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(2000), // max quantity tradeable for market order is 1000
                leverage: toBigNumberStr(1),
                liquidator: ownerAddress, // owner is the liquidator
                gasBudget: 90000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[21]);
    });

    it("should revert as liquidatee(maker) has zero sized position", async () => {
        const accounts = getMakerTakerAccounts(provider, true);

        await mintAndDeposit(onChain, accounts.maker.address);
        await mintAndDeposit(onChain, accounts.taker.address);

        // open a position between the accounts
        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            accounts.maker.keyPair,
            accounts.taker.keyPair,
            { ...order, maker: accounts.maker.address }
        );
        const tx1 = await onChain.trade({ ...trade, settlementCapID });
        expectTxToSucceed(tx1);

        // close position
        const trade2 = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            accounts.taker.keyPair,
            accounts.maker.keyPair,
            { ...order, maker: accounts.taker.address }
        );
        const tx2 = await onChain.trade({ ...trade2, settlementCapID });
        expectTxToSucceed(tx2);

        // try to deleverage
        const txResponse = await onChain.liquidate(
            {
                liquidatee: accounts.maker.address, // has zero sized position
                quantity: toBigNumberStr(1),
                leverage: toBigNumberStr(1),
                liquidator: ownerAddress, // owner is the liquidator
                gasBudget: 90000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[510]);
    });

    it("should revert as liquidatee(alice) is above mmr - can not be liquidated", async () => {
        const txResponse = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(1),
                leverage: toBigNumberStr(1),
                liquidator: ownerAddress, // owner is the liquidator
                gasBudget: 9000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[703]);
    });

    it("should revert as all or nothing flag is set and liquidatee's qPos < liquidation quantity", async () => {
        // set oracle price to 89, alice becomes liquidate-able
        await onChain.setOraclePrice({
            price: 89
        });

        const txResponse = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(2), // alice has only 1 quantity
                leverage: toBigNumberStr(1),
                allOrNothing: true,
                liquidator: ownerAddress, // owner is the liquidator
                gasBudget: 9000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[701]);
    });

    it("should revert as liquidator's leverage is different from leverage being used for liquidation trade", async () => {
        // open a position at 2x leverage between cat and dog

        const makerTaker = await getMakerTakerAccounts(provider, true);

        // maker will be performing liquidation
        await requestGas(makerTaker.maker.address);

        await mintAndDeposit(onChain, makerTaker.maker.address);
        await mintAndDeposit(onChain, makerTaker.taker.address);

        const order = createOrder({
            market: onChain.getPerpetualID(),
            price: 100,
            isBuy: true,
            leverage: 2,
            maker: await makerTaker.maker.address
        });

        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            makerTaker.maker.keyPair,
            makerTaker.taker.keyPair,
            order
        );

        const tx = await onChain.trade({ ...trade, settlementCapID });
        expectTxToSucceed(tx);

        // ==================================================

        // set oracle price to 89, alice becomes liquidate-able
        await onChain.setOraclePrice({
            price: 89
        });

        // try to liquidate alice at 4x leverage using maker account
        // having an already open position at 2x
        const txResponse = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(1),
                leverage: toBigNumberStr(4), // trying to liquidate at 4x
                liquidator: makerTaker.maker.address, // maker is the liquidator
                gasBudget: 90000000
            },
            makerTaker.maker.signer
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[702]);
    });

    it("should successfully completely liquidate the maker/alice", async () => {
        // set oracle price to 89, alice becomes liquidate-able
        await onChain.setOraclePrice({
            price: 89
        });

        const txResponse = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(1),
                leverage: toBigNumberStr(1),
                allOrNothing: true,
                liquidator: ownerAddress // owner is the liquidator
            },
            ownerSigner
        );

        expectTxToSucceed(txResponse);

        const liqPosition = Transaction.getAccountPosition(
            txResponse,
            ownerAddress
        );

        const alicePosition = Transaction.getAccountPosition(
            txResponse,
            alice.address
        );

        expect(liqPosition.qPos).to.be.equal(
            toBigNumberStr(1, BASE_DECIMALS_ON_CHAIN)
        );
        expect(alicePosition.qPos).to.be.equal(
            toBigNumberStr(0, BASE_DECIMALS_ON_CHAIN)
        );
    });

    it("should partially liquidate the taker(bob)", async () => {
        // deploy market
        const localDeployment = deployment;

        localDeployment["markets"]["ETH-PERP"]["Objects"] = await createMarket(
            localDeployment,
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

        const onChain = new OnChainCalls(ownerSigner, localDeployment);

        await onChain.setOraclePrice({
            price: 100
        });

        const makerTaker = await getMakerTakerAccounts(provider, true);

        await mintAndDeposit(onChain, makerTaker.maker.address);
        await mintAndDeposit(onChain, makerTaker.taker.address);

        const order = createOrder({
            market: onChain.getPerpetualID(),
            quantity: 2,
            price: 100,
            isBuy: true,
            leverage: 10,
            maker: makerTaker.maker.address
        });

        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            makerTaker.maker.keyPair,
            makerTaker.taker.keyPair,
            order
        );

        const tx = await onChain.trade({ ...trade, settlementCapID });
        expectTxToSucceed(tx);

        // ==================================================

        // set oracle price to 115, taker becomes liquidate-able
        await onChain.setOraclePrice({
            price: 115
        });

        const txResponse = await onChain.liquidate(
            {
                liquidatee: makerTaker.taker.address,
                quantity: toBigNumberStr(1.5), // liquidating 1.5 out of 2
                leverage: toBigNumberStr(2),
                liquidator: ownerAddress
            },
            ownerSigner
        );

        expectTxToSucceed(txResponse);

        const liqPosition = Transaction.getAccountPosition(
            txResponse,
            ownerAddress
        ) as UserPositionExtended;

        const takerPosition = Transaction.getAccountPosition(
            txResponse,
            makerTaker.taker.address
        ) as UserPositionExtended;

        expect(liqPosition.qPos).to.be.equal(
            toBigNumberStr(1.5, BASE_DECIMALS_ON_CHAIN)
        );
        expect(takerPosition.qPos).to.be.equal(
            toBigNumberStr(0.5, BASE_DECIMALS_ON_CHAIN)
        );
    });

    it("should allow sub account to liquidate on parent's behalf", async () => {
        // deploy market
        const localDeployment = deployment;

        localDeployment["markets"]["ETH-PERP"]["Objects"] = await createMarket(
            localDeployment,
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

        const onChain = new OnChainCalls(ownerSigner, localDeployment);

        await onChain.setOraclePrice({
            price: 100
        });

        const makerTaker = await getMakerTakerAccounts(provider, true);

        await mintAndDeposit(onChain, makerTaker.maker.address);
        await mintAndDeposit(onChain, makerTaker.taker.address);

        const order = createOrder({
            market: onChain.getPerpetualID(),
            quantity: 2,
            price: 100,
            isBuy: true,
            leverage: 10,
            maker: makerTaker.maker.address
        });

        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            makerTaker.maker.keyPair,
            makerTaker.taker.keyPair,
            order
        );

        const tx = await onChain.trade({ ...trade, settlementCapID });
        expectTxToSucceed(tx);

        // ==================================================

        // set oracle price to 115, taker becomes liquidate-able
        await onChain.setOraclePrice({
            price: 115
        });

        const tester = getTestAccounts(provider)[0];

        // ownerSigner sets tester as its sub account
        await onChain.setSubAccount({ account: tester.address, status: true });

        const txResponse = await onChain.liquidate(
            {
                liquidatee: makerTaker.taker.address,
                quantity: toBigNumberStr(1.5), // liquidating 1.5 out of 2
                leverage: toBigNumberStr(2),
                liquidator: ownerAddress // owner is liquidator
            },
            tester.signer // testers is invoking the call
        );

        expectTxToSucceed(txResponse);
    });
});
