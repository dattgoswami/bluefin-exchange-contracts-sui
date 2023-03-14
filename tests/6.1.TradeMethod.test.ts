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
import { ERROR_CODES, OWNERSHIP_ERROR } from "../src/errors";
import { bigNumber, toBigNumber, toBigNumberStr } from "../src/library";
import { getTestAccounts } from "./helpers/accounts";
import { Trader } from "../src/classes/Trader";
import { network } from "../src/DeploymentConfig";
import { mintAndDeposit } from "./helpers/utils";
import { Order } from "../src/interfaces";

chai.use(chaiAsPromised);
const expect = chai.expect;
const provider = getProvider(network.rpc, network.faucet);

describe("Regular Trade Method", () => {
    const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
    const deployment = readFile(DeploymentConfigs.filePath);
    let onChain: OnChainCalls;
    let ownerAddress: string;
    let priceOracleCapID: string;
    let settlementCapID: string;

    const [alice, bob] = getTestAccounts(provider);

    const orderSigner = new OrderSigner(alice.keyPair);

    let defaultOrder: Order;

    before(async () => {
        // deploy market
        deployment["markets"]["ETH-PERP"]["Objects"] = (
            await createMarket(deployment, ownerSigner, provider)
        ).marketObjects;

        onChain = new OnChainCalls(ownerSigner, deployment);
        ownerAddress = await getAddressFromSigner(ownerSigner);

        // make owner, the price oracle operator
        const tx = await onChain.setPriceOracleOperator({
            operator: ownerAddress
        });
        priceOracleCapID = (
            Transaction.getObjects(
                tx,
                "newObject",
                "PriceOracleOperatorCap"
            )[0] as any
        ).id as string;

        // make admin operator
        const tx2 = await onChain.createSettlementOperator(
            { operator: ownerAddress },
            ownerSigner
        );
        settlementCapID = (
            Transaction.getObjects(tx2, "newObject", "SettlementCap")[0] as any
        ).id as string;

        defaultOrder = createOrder({
            isBuy: true,
            maker: alice.address,
            market: onChain.getPerpetualID()
        });
    });

    it("should execute trade call", async () => {
        await mintAndDeposit(onChain, alice.address, 2000);
        await mintAndDeposit(onChain, bob.address, 2000);

        const priceTx = await onChain.updateOraclePrice({
            price: toBigNumberStr(1),
            updateOPCapID: priceOracleCapID
        });

        expectTxToSucceed(priceTx);

        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            alice.keyPair,
            bob.keyPair,
            defaultOrder
        );

        const tx = await onChain.trade({ ...trade, settlementCapID });
        expectTxToSucceed(tx);
    });

    it("should execute trade call and fill alice`s order but opens no position as its a self trade", async () => {
        await mintAndDeposit(onChain, alice.address, 2000);

        const priceTx = await onChain.updateOraclePrice({
            price: toBigNumberStr(1),
            updateOPCapID: priceOracleCapID
        });

        expectTxToSucceed(priceTx);

        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            alice.keyPair, // alice is maker
            alice.keyPair, // alice is taker
            { ...defaultOrder, salt: bigNumber(Date.now()) }
        );

        const tx = await onChain.trade({ ...trade, settlementCapID });
        expectTxToSucceed(tx); // tx should succeed
        expect(Transaction.getEvents(tx, "TradeExecuted").length).to.be.equal(
            0
        );
        expect(
            Transaction.getEvents(tx, "BankBalanceUpdate").length
        ).to.be.equal(0);

        // both alice's orders should be filled
        expect(Transaction.getEvents(tx, "OrderFill").length).to.be.equal(2);
    });

    it("should revert trade as alice is not the owner of settlement cap", async () => {
        const tradeData = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            alice.keyPair,
            bob.keyPair,
            defaultOrder
        );

        const error = OWNERSHIP_ERROR(
            settlementCapID,
            ownerAddress,
            alice.address
        );

        await expect(
            onChain.trade({ ...tradeData, settlementCapID }, alice.signer)
        ).to.be.eventually.rejectedWith(error);
    });

    it("should revert trade as alice owns settlement cap but is removed from valid set of operators", async () => {
        const tradeData = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            alice.keyPair,
            bob.keyPair,
            defaultOrder
        );

        const tx = await onChain.createSettlementOperator({
            operator: alice.address
        });
        const capID = (
            Transaction.getObjects(tx, "newObject", "SettlementCap")[0] as any
        ).id as string;

        const tx2 = await onChain.removeSettlementOperator({ capID });
        expectTxToSucceed(tx2);

        const tx3 = await onChain.trade(
            {
                ...tradeData,
                settlementCapID: capID
            },
            alice.signer
        );

        expect(Transaction.getError(tx3), ERROR_CODES[110]);
    });

    it("should revert as maker and taker are both going long", async () => {
        const tx = await onChain.trade({
            ...(await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                { ...defaultOrder, isBuy: true },
                { takerOrder: { ...defaultOrder, isBuy: true } }
            )),
            settlementCapID
        });
        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[18]);
    });

    it("should revert as maker and taker are both going short", async () => {
        const tx = await onChain.trade({
            ...(await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                { ...defaultOrder, isBuy: false },
                { takerOrder: { ...defaultOrder, isBuy: false } }
            )),
            settlementCapID
        });
        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[18]);
    });

    it("should revert as bob order expiration is < current chain time", async () => {
        const tx = await onChain.trade({
            ...(await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                defaultOrder,
                {
                    takerOrder: {
                        ...defaultOrder,
                        isBuy: !defaultOrder.isBuy,
                        expiration: bigNumber(1)
                    }
                }
            )),
            settlementCapID
        });

        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[33]);
    });

    it("should revert as fill price is invalid for maker/alice", async () => {
        const makerOrder = createOrder({
            maker: alice.address,
            price: 26,
            quantity: 20
        });

        const takerOrder = createOrder({
            maker: bob.address,
            isBuy: true,
            price: 25,
            quantity: 20
        });

        const tx = await onChain.trade({
            ...(await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                takerOrder
            )),
            settlementCapID
        });
        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[34]);
    });

    it("should revert as fill does not decrease size (reduce only)", async () => {
        const makerOrder = createOrder({
            maker: alice.address,
            price: 26,
            quantity: 20
        });
        const takerOrder = createOrder({
            maker: bob.address,
            isBuy: true,
            price: 26,
            quantity: 20,
            reduceOnly: true
        });

        const tx = await onChain.trade({
            ...(await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                takerOrder
            )),
            settlementCapID
        });

        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[39]);
    });

    it("should revert as maker/alice leverage is invalid", async () => {
        const makerOrder = createOrder({
            maker: alice.address,
            isBuy: true,
            price: 26,
            quantity: 20,
            leverage: 0.9
        });
        const takerOrder = createOrder({
            maker: bob.address,
            isBuy: false,
            price: 26,
            quantity: 20
        });

        const tx = await onChain.trade({
            ...(await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                takerOrder
            )),
            settlementCapID
        });

        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[40]);
    });

    it("should revert as taker/bob leverage is invalid", async () => {
        const makerOrder = createOrder({
            maker: alice.address,
            isBuy: true,
            price: 26,
            quantity: 20,
            leverage: 1
        });

        const takerOrder = createOrder({
            maker: bob.address,
            isBuy: false,
            price: 26,
            quantity: 20,
            leverage: 0.9
        });

        const tx = await onChain.trade({
            ...(await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder: takerOrder }
            )),
            settlementCapID
        });

        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[41]);
    });

    it("should revert as taker/bob order is being over filled", async () => {
        const makerOrder = createOrder({
            maker: alice.address,
            price: 26,
            quantity: 20
        });
        const takerOrder = createOrder({
            maker: bob.address,
            isBuy: true,
            price: 26,
            quantity: 15
        });

        const tradeParams = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            alice.keyPair,
            bob.keyPair,
            makerOrder,
            takerOrder
        );

        const tx = await onChain.trade({ ...tradeParams, settlementCapID });
        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[29]);
    });

    it("should revert as maker/alice order is being over filled", async () => {
        const makerOrder = createOrder({
            maker: alice.address,
            price: 26,
            quantity: 15
        });

        const takerOrder = createOrder({
            maker: bob.address,
            isBuy: true,
            price: 26,
            quantity: 30
        });

        const tradeParams = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            alice.keyPair,
            bob.keyPair,
            makerOrder,
            takerOrder
        );

        tradeParams.fillQuantity = toBigNumber(25);
        const tx = await onChain.trade({ ...tradeParams, settlementCapID });
        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[27]);
    });

    it("should revert as alice signature does not match the order", async () => {
        const makerOrder = createOrder({
            maker: alice.address,
            price: 26,
            quantity: 20
        });

        const takerOrder = createOrder({
            maker: bob.address,
            isBuy: true,
            price: 25,
            quantity: 20
        });

        const makerOrderSigned = new OrderSigner(alice.keyPair).getSignedOrder(
            makerOrder
        );

        const updatedMakerOrder = createOrder({
            maker: alice.address,
            price: 99,
            quantity: 20
        });
        const takerOrderSigned = new OrderSigner(bob.keyPair).getSignedOrder(
            takerOrder
        );

        const txResponse = await onChain.trade({
            makerOrder: updatedMakerOrder,
            makerSignature: makerOrderSigned.typedSignature,
            takerOrder: takerOrder,
            takerSignature: takerOrderSigned.typedSignature,
            fillQuantity: toBigNumber(5),
            settlementCapID
        });

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[12]);
    });

    it("should revert as alice signed order for ETH market but is getting executed on BTC market", async () => {
        const priceTx = await onChain.updateOraclePrice({
            price: toBigNumberStr(1),
            updateOPCapID: priceOracleCapID
        });

        expectTxToSucceed(priceTx);

        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            alice.keyPair,
            bob.keyPair,
            defaultOrder // this order is signed for ETH market
        );

        // deploying a new market
        deployment["markets"]["BTC-PERP"] = {
            Objects: (await createMarket(deployment, ownerSigner, provider))
                .marketObjects
        };

        onChain = new OnChainCalls(ownerSigner, deployment);

        const tx = await onChain.trade({
            ...trade,
            perpID: onChain.getPerpetualID("BTC-PERP"),
            settlementCapID
        });

        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[12]);
    });

    it("should allow a sub account to trade on alice's behalf", async () => {
        await mintAndDeposit(onChain, alice.address, 2000);
        await mintAndDeposit(onChain, bob.address, 2000);

        const tester = getTestAccounts(provider)[2];
        await mintAndDeposit(onChain, tester.address, 2000);

        const priceTx = await onChain.updateOraclePrice({
            price: toBigNumberStr(1),
            updateOPCapID: priceOracleCapID
        });

        expectTxToSucceed(priceTx);

        // alice makes bob her sub account
        const tx = await onChain.setSubAccount(
            { account: bob.address, status: true },
            alice.signer
        );
        expectTxToSucceed(tx);

        defaultOrder.maker = tester.address;

        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            tester.keyPair,
            bob.keyPair,
            defaultOrder,
            {
                takerOrder: {
                    ...defaultOrder,
                    maker: alice.address,
                    isBuy: !defaultOrder.isBuy
                }
            } // taker order signed by bob for alice
        );

        const tx2 = await onChain.trade({ ...trade, settlementCapID });
        expectTxToSucceed(tx2);

        const TradeExecuted = Transaction.getEvents(tx2, "TradeExecuted")[0];

        //taker of the trade was alice
        expect(TradeExecuted.fields.taker).to.be.equal(alice.address);

        const orderFill = Transaction.getEvents(tx2, "OrderFill").filter(
            (event) => {
                return event.fields.order.fields.maker == alice.address;
            }
        )[0];

        expect(orderFill.fields.sigMaker).to.be.equal(bob.address);
    });
});
