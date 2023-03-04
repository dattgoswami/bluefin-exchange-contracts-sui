import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfigs } from "../src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getAddressFromSigner,
    getSignerFromSeed,
    createOrder,
    createMarket,
    requestGas
} from "../src/utils";
import { OnChainCalls, OrderSigner, Transaction } from "../src/classes";
import { expectTxToFail, expectTxToSucceed } from "./helpers/expect";
import { ERROR_CODES } from "../src/errors";
import { toBigNumberStr } from "../src/library";
import { getMakerTakerAccounts, getTestAccounts } from "./helpers/accounts";
import { Trader } from "../src/classes/Trader";
import { network } from "../src/DeploymentConfig";
import { DEFAULT } from "../src/defaults";
import { Order, UserPositionExtended } from "../src";
import { mintAndDeposit } from "./helpers/utils";

chai.use(chaiAsPromised);
const expect = chai.expect;
const provider = getProvider(network.rpc, network.faucet);
const deployment = readFile(DeploymentConfigs.filePath);

describe("Liquidation Trade Method", () => {
    const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
    let onChain: OnChainCalls;
    let ownerAddress: string;

    const [alice, bob] = getTestAccounts(provider);

    const orderSigner = new OrderSigner(alice.keyPair);

    let order: Order;

    before(async () => {
        // deploy market
        deployment["markets"] = {
            "ETH-PERP": {
                Objects: (await createMarket(deployment, ownerSigner, provider))
                    .marketObjects
            }
        };

        onChain = new OnChainCalls(ownerSigner, deployment);

        // will be using owner as liquidator
        ownerAddress = await getAddressFromSigner(ownerSigner);

        // make admin operator
        await onChain.setSettlementOperator(
            { operator: ownerAddress, status: true },
            ownerSigner
        );

        // set oracle price
        const priceTx = await onChain.updateOraclePrice({
            price: toBigNumberStr(100)
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

        // open a position at 10x leverage between
        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            alice.keyPair,
            bob.keyPair,
            order
        );
        const tx = await onChain.trade(trade);
        expectTxToSucceed(tx);
    });

    beforeEach(async () => {
        // set oracle price to 100
        await onChain.updateOraclePrice({
            price: toBigNumberStr(100)
        });
    });

    it("should revert as sender of the trade is not the same as liquidator", async () => {
        const txResponse = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(1),
                leverage: toBigNumberStr(1),
                liquidator: bob.address // liquidator is bob
            },
            ownerSigner
        ); // caller is owner

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[51]);
    });

    it("should revert as account(maker) being liquidated has no position", async () => {
        const txResponse = await onChain.liquidate(
            {
                liquidatee: DEFAULT.RANDOM_ACCOUNT_ADDRESS, // a random account with no position
                quantity: toBigNumberStr(1),
                leverage: toBigNumberStr(1),
                liquidator: ownerAddress // owner is the liquidator
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[510]);
    });

    it("should revert as quantity to be liquidated < min allowed quantity ", async () => {
        const txResponse = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(0.01), // min quantity tradeable is 0.1
                leverage: toBigNumberStr(1),
                liquidator: ownerAddress // owner is the liquidator
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[19]);
    });

    it("should revert as quantity to be liquidated > max allowed limit quantity", async () => {
        const txResponse = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(500000), // max quantity tradeable for limit order is 100000
                leverage: toBigNumberStr(1),
                liquidator: ownerAddress // owner is the liquidator
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[20]);
    });

    it("should revert as quantity to be liquidated > max allowed market order size", async () => {
        const txResponse = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(2000), // max quantity tradeable for market order is 1000
                leverage: toBigNumberStr(1),
                liquidator: ownerAddress // owner is the liquidator
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[21]);
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
        const tx1 = await onChain.trade(trade);
        expectTxToSucceed(tx1);

        // close position
        const trade2 = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            accounts.taker.keyPair,
            accounts.maker.keyPair,
            { ...order, maker: accounts.taker.address }
        );
        const tx2 = await onChain.trade(trade2);
        expectTxToSucceed(tx2);

        // try to deleverage
        const txResponse = await onChain.liquidate(
            {
                liquidatee: accounts.maker.address, // has zero sized position
                quantity: toBigNumberStr(1),
                leverage: toBigNumberStr(1),
                liquidator: ownerAddress // owner is the liquidator
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[510]);
    });

    it("should revert as liquidatee(alice) is above mmr - can not be liquidated", async () => {
        const txResponse = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(1),
                leverage: toBigNumberStr(1),
                liquidator: ownerAddress // owner is the liquidator
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[703]);
    });

    it("should revert as all or nothing flag is set and liquidatee's qPos < liquidation quantity", async () => {
        // set oracle price to 89, alice becomes liquidate-able
        await onChain.updateOraclePrice({
            price: toBigNumberStr(89)
        });

        const txResponse = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(2), // alice has only 1 quantity
                leverage: toBigNumberStr(1),
                allOrNothing: true,
                liquidator: ownerAddress // owner is the liquidator
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[701]);
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

        const tx = await onChain.trade(trade);
        expectTxToSucceed(tx);

        // ==================================================

        // set oracle price to 89, alice becomes liquidate-able
        await onChain.updateOraclePrice({
            price: toBigNumberStr(89)
        });

        // try to liquidate alice at 4x leverage using maker account
        // having an already open position at 2x
        const txResponse = await onChain.liquidate(
            {
                liquidatee: alice.address,
                quantity: toBigNumberStr(1),
                leverage: toBigNumberStr(4), // trying to liquidate at 4x
                liquidator: makerTaker.maker.address // maker is the liquidator
            },
            makerTaker.maker.signer
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[702]);
    });

    it("should successfully completely liquidate alice/maker", async () => {
        // set oracle price to 89, alice becomes liquidate-able
        await onChain.updateOraclePrice({
            price: toBigNumberStr(89)
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

        const liqPosition = Transaction.getAccountPositionFromEvent(
            txResponse,
            ownerAddress
        ) as UserPositionExtended;

        const alicePosition = Transaction.getAccountPositionFromEvent(
            txResponse,
            alice.address
        ) as UserPositionExtended;

        expect(liqPosition.qPos).to.be.equal(toBigNumberStr(1));
        expect(alicePosition.qPos).to.be.equal(toBigNumberStr(0));
    });

    it("should partially liquidate the taker(bob)", async () => {
        // deploy market
        const localDeployment = deployment;

        localDeployment["markets"] = {
            "ETH-PERP": {
                Objects: (
                    await createMarket(localDeployment, ownerSigner, provider)
                ).marketObjects
            }
        };

        const onChain = new OnChainCalls(ownerSigner, localDeployment);

        await onChain.updateOraclePrice({
            price: toBigNumberStr(100)
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

        const tx = await onChain.trade(trade);
        expectTxToSucceed(tx);

        // ==================================================

        // set oracle price to 115, taker becomes liquidate-able
        await onChain.updateOraclePrice({
            price: toBigNumberStr(115)
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

        const liqPosition = Transaction.getAccountPositionFromEvent(
            txResponse,
            ownerAddress
        ) as UserPositionExtended;

        const takerPosition = Transaction.getAccountPositionFromEvent(
            txResponse,
            makerTaker.taker.address
        ) as UserPositionExtended;

        expect(liqPosition.qPos).to.be.equal(toBigNumberStr(1.5));
        expect(takerPosition.qPos).to.be.equal(toBigNumberStr(0.5));
    });
});
