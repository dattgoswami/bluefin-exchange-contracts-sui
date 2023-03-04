import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfigs } from "../src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getAddressFromSigner,
    getSignerFromSeed,
    createOrder,
    createMarket
} from "../src/utils";
import { OnChainCalls, OrderSigner, Transaction } from "../src/classes";
import { expectTxToFail, expectTxToSucceed } from "./helpers/expect";
import { ERROR_CODES } from "../src/errors";
import { toBigNumber, toBigNumberStr } from "../src/library";
import {
    createAccount,
    getMakerTakerAccounts,
    getTestAccounts
} from "./helpers/accounts";
import { Trader } from "../src/classes/Trader";
import { network } from "../src/DeploymentConfig";
import { DEFAULT } from "../src/defaults";
import { Order, UserPositionExtended } from "../src";
import { mintAndDeposit } from "./helpers/utils";

chai.use(chaiAsPromised);
const expect = chai.expect;
const provider = getProvider(network.rpc, network.faucet);
const deployment = readFile(DeploymentConfigs.filePath);

describe("Deleveraging Trade Method", () => {
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

        order = createOrder({
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

    xit("should revert as only ADL operator can perform deleveraging trades", async () => {
        // TODO
    });

    it("should revert as maker account being deleveraged has no position object", async () => {
        const txResponse = await onChain.deleverage(
            {
                maker: DEFAULT.RANDOM_ACCOUNT_ADDRESS, // a random account with no position
                taker: bob.address,
                quantity: toBigNumberStr(1)
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[505]);
    });

    it("should revert as taker account being deleveraged has no position object", async () => {
        const txResponse = await onChain.deleverage(
            {
                maker: alice.address,
                taker: DEFAULT.RANDOM_ACCOUNT_ADDRESS, // a random account with no position
                quantity: toBigNumberStr(1)
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[505]);
    });

    it("should revert as maker of adl trade has zero sized position", async () => {
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
        const txResponse = await onChain.deleverage(
            {
                maker: accounts.maker.address,
                taker: accounts.taker.address,
                quantity: toBigNumberStr(1)
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[510]);
    });

    it("should revert as taker of adl trade has zero sized position", async () => {
        const accounts = getMakerTakerAccounts(provider, true);
        const tempTaker = createAccount(provider);
        await mintAndDeposit(onChain, accounts.maker.address);
        await mintAndDeposit(onChain, accounts.taker.address);
        await mintAndDeposit(onChain, tempTaker.address);

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

        // close position for taker
        const trade2 = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            accounts.taker.keyPair,
            tempTaker.keyPair,
            { ...order, maker: accounts.taker.address }
        );

        const tx2 = await onChain.trade(trade2);
        expectTxToSucceed(tx2);

        // try to deleverage
        const txResponse = await onChain.deleverage(
            {
                maker: accounts.maker.address,
                taker: accounts.taker.address, // taker has no position
                quantity: toBigNumberStr(1)
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[511]);
    });

    it("should revert as all or nothing flag is set and maker qPos < deleveraging quantity", async () => {
        const txResponse = await onChain.deleverage(
            {
                maker: alice.address,
                taker: bob.address,
                quantity: toBigNumberStr(2), // alice has only got 1 quantity
                allOrNothing: true
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[803]);
    });

    it("should revert as all or nothing flag is set and taker qPos < deleveraging quantity", async () => {
        const accounts = getMakerTakerAccounts(provider, true);
        await mintAndDeposit(onChain, accounts.maker.address);
        await mintAndDeposit(onChain, accounts.taker.address);

        // open a position between the accounts
        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            accounts.maker.keyPair,
            accounts.taker.keyPair,
            {
                ...order,
                maker: accounts.maker.address,
                quantity: toBigNumber(2)
            }
        );

        const tx1 = await onChain.trade(trade);
        expectTxToSucceed(tx1);

        const txResponse = await onChain.deleverage(
            {
                maker: accounts.maker.address,
                taker: bob.address,
                quantity: toBigNumberStr(2), // bob has only got 1 quantity
                allOrNothing: true
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[804]);
    });

    it("should revert as quantity being deleverage < min allowed quantity ", async () => {
        const txResponse = await onChain.deleverage(
            {
                maker: alice.address,
                taker: bob.address,
                quantity: toBigNumberStr(0.01) // min quantity tradeable is 0.1
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[19]);
    });

    it("should revert as quantity to be liquidated > max allowed limit quantity", async () => {
        const txResponse = await onChain.deleverage(
            {
                maker: alice.address,
                taker: bob.address,
                quantity: toBigNumberStr(500000) // max quantity tradeable for limit order is 100000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[20]);
    });

    it("should revert as quantity to be liquidated > max allowed market order size", async () => {
        const txResponse = await onChain.deleverage(
            {
                maker: alice.address,
                taker: bob.address,
                quantity: toBigNumberStr(2000) // max quantity tradeable for market order is 1000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[21]);
    });

    it("should revert as maker(alice) is above mmr - can not be deleveraged", async () => {
        const txResponse = await onChain.deleverage(
            {
                maker: alice.address,
                taker: bob.address,
                quantity: toBigNumberStr(1)
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[800]);
    });

    it("should revert as maker(alice) is above under water - can not be deleveraged", async () => {
        await onChain.updateOraclePrice({
            price: toBigNumberStr(92)
        });

        const txResponse = await onChain.deleverage(
            {
                maker: alice.address,
                taker: bob.address,
                quantity: toBigNumberStr(1)
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[800]);
    });

    it("should revert as taker(bob) is under water - can not be taker of deleveraging trade", async () => {
        const accounts = getMakerTakerAccounts(provider, true);
        await mintAndDeposit(onChain, accounts.maker.address);
        await mintAndDeposit(onChain, accounts.taker.address);

        // open a position between the accounts
        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            accounts.maker.keyPair,
            accounts.taker.keyPair,
            {
                ...order,
                maker: accounts.maker.address,
                quantity: toBigNumber(2)
            }
        );

        const tx1 = await onChain.trade(trade);
        expectTxToSucceed(tx1);

        // at this price bob becomes under water and so does accounts.taker
        await onChain.updateOraclePrice({
            price: toBigNumberStr(112)
        });

        const txResponse = await onChain.deleverage(
            {
                maker: accounts.taker.address, // under water, can be maker
                taker: bob.address, // under water, can note be taker
                quantity: toBigNumberStr(1)
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[801]);
    });

    it("should revert as maker and taker of an adl trade must have opposite side positions", async () => {
        const accounts = getMakerTakerAccounts(provider, true);
        await mintAndDeposit(onChain, accounts.maker.address);
        await mintAndDeposit(onChain, accounts.taker.address);

        // open a position between the accounts
        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            accounts.maker.keyPair,
            accounts.taker.keyPair,
            {
                ...order,
                maker: accounts.maker.address,
                quantity: toBigNumber(2),
                leverage: toBigNumber(2)
            }
        );

        const tx1 = await onChain.trade(trade);
        expectTxToSucceed(tx1);

        // at this price bob becomes under water
        await onChain.updateOraclePrice({
            price: toBigNumberStr(112)
        });

        const txResponse = await onChain.deleverage(
            {
                maker: bob.address, // under water, can be maker - has short position
                taker: accounts.taker.address, // above water so can be taker but has short position
                quantity: toBigNumberStr(1)
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[802]);
    });

    it("should successfully completely deleverage alice against cat", async () => {
        const accounts = getMakerTakerAccounts(provider, true);
        await mintAndDeposit(onChain, accounts.maker.address);
        await mintAndDeposit(onChain, accounts.taker.address);

        // open a position between the accounts
        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            accounts.maker.keyPair,
            accounts.taker.keyPair,
            {
                ...order,
                maker: accounts.maker.address,
                quantity: toBigNumber(2),
                leverage: toBigNumber(1),
                isBuy: false
            }
        );

        const tx1 = await onChain.trade(trade);
        expectTxToSucceed(tx1);

        // set oracle price to 89, alice becomes under water
        await onChain.updateOraclePrice({
            price: toBigNumberStr(89)
        });

        const txResponse = await onChain.deleverage(
            {
                maker: alice.address,
                taker: accounts.maker.address,
                quantity: toBigNumberStr(1)
            },
            ownerSigner
        );

        expectTxToSucceed(txResponse);

        const catPosition = Transaction.getAccountPositionFromEvent(
            txResponse,
            accounts.maker.address
        ) as UserPositionExtended;

        const alicePosition = Transaction.getAccountPositionFromEvent(
            txResponse,
            alice.address
        ) as UserPositionExtended;

        expect(catPosition.qPos).to.be.equal(toBigNumberStr(1));
        expect(alicePosition.qPos).to.be.equal(toBigNumberStr(0));
    });

    it("should successfully partially deleverage taker of adl trade", async () => {
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

        await mintAndDeposit(onChain, alice.address);
        await mintAndDeposit(onChain, bob.address);

        await onChain.updateOraclePrice({
            price: toBigNumberStr(100)
        });

        const order = createOrder({
            market: onChain.getPerpetualID(),
            quantity: 1,
            price: 100,
            isBuy: true,
            leverage: 10,
            maker: alice.address
        });

        // open a position between alice and bob
        const trade1 = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            alice.keyPair,
            bob.keyPair,
            order
        );

        const tx1 = await onChain.trade(trade1);

        expectTxToSucceed(tx1);

        const accounts = getMakerTakerAccounts(provider, true);
        await mintAndDeposit(onChain, accounts.maker.address);
        await mintAndDeposit(onChain, accounts.taker.address);

        // open a position between the accounts
        const trade2 = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            accounts.maker.keyPair,
            accounts.taker.keyPair,
            {
                ...order,
                maker: accounts.maker.address,
                quantity: toBigNumber(2),
                leverage: toBigNumber(1),
                isBuy: false
            }
        );

        const tx2 = await onChain.trade(trade2);
        expectTxToSucceed(tx2);

        // ==================================================

        // set oracle price to 115, taker/bob becomes under water
        await onChain.updateOraclePrice({
            price: toBigNumberStr(115)
        });

        const txResponse = await onChain.deleverage(
            {
                maker: bob.address,
                taker: accounts.taker.address,
                quantity: toBigNumberStr(0.5)
            },
            ownerSigner
        );

        expectTxToSucceed(txResponse);

        const adlTakerPos = Transaction.getAccountPositionFromEvent(
            txResponse,
            accounts.taker.address
        ) as UserPositionExtended;

        const bobPos = Transaction.getAccountPositionFromEvent(
            txResponse,
            bob.address
        ) as UserPositionExtended;

        expect(adlTakerPos.qPos).to.be.equal(toBigNumberStr(1.5));
        expect(bobPos.qPos).to.be.equal(toBigNumberStr(0.5));
    });
});
