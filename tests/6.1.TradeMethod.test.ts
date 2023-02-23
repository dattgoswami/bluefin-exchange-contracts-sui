import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfigs } from "../src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getSignerSUIAddress,
    getSignerFromSeed,
    createOrder
} from "../src/utils";
import { OnChainCalls, OrderSigner, Transaction } from "../src/classes";
import { expectTxToFail, expectTxToSucceed } from "./helpers/expect";
import { ERROR_CODES } from "../src/errors";
import { bigNumber, toBigNumber, toBigNumberStr } from "../src/library";
import { getTestAccounts } from "./helpers/accounts";
import { Trader } from "../src/classes/Trader";
import { network } from "../src/DeploymentConfig";

chai.use(chaiAsPromised);
const expect = chai.expect;
const provider = getProvider(network.rpc, network.faucet);

describe("Trades", () => {
    const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
    let deployment = readFile(DeploymentConfigs.filePath);
    let onChain: OnChainCalls = new OnChainCalls(ownerSigner, deployment);
    let ownerAddress: string;

    const [alice, bob] = getTestAccounts(provider);

    const orderSigner = new OrderSigner(alice.keyPair);

    const defaultOrder = createOrder({
        isBuy: true,
        makerAddress: alice.address
    });

    before(async () => {
        ownerAddress = await getSignerSUIAddress(ownerSigner);
        // make admin operator
        await onChain.setSettlementOperator(
            { operator: ownerAddress, status: true },
            ownerSigner
        );
    });

    it("should execute trade call", async () => {
        const priceTx = await onChain.updateOraclePrice({
            price: toBigNumberStr(1)
        });
        expectTxToSucceed(priceTx);

        const trade = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            alice.keyPair,
            bob.keyPair,
            defaultOrder
        );
        const tx = await onChain.trade(trade);
        expectTxToSucceed(tx);
    });

    it("should revert trade as alice is neither taker nor settlement operator", async () => {
        const txResponse = await onChain.trade(
            await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                defaultOrder
            ),
            alice.signer
        );
        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[27]);
    });

    it("should revert as maker and taker are both going long", async () => {
        const tx = await onChain.trade(
            await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                { ...defaultOrder, isBuy: true },
                { ...defaultOrder, isBuy: true }
            )
        );
        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[18]);
    });

    it("should revert as maker and taker are both going short", async () => {
        const tx = await onChain.trade(
            await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                { ...defaultOrder, isBuy: false },
                { ...defaultOrder, isBuy: false }
            )
        );
        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[18]);
    });

    it("should revert as bob order expiration is < current chain time", async () => {
        const tx = await onChain.trade(
            await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                defaultOrder,
                {
                    ...defaultOrder,
                    isBuy: !defaultOrder.isBuy,
                    expiration: bigNumber(1)
                }
            )
        );

        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[33]);
    });

    it("should revert as fill price is invalid for maker/alice", async () => {
        const makerOrder = createOrder({
            makerAddress: alice.address,
            price: 26,
            quantity: 20
        });

        const takerOrder = createOrder({
            makerAddress: bob.address,
            isBuy: true,
            price: 25,
            quantity: 20
        });

        const tx = await onChain.trade(
            await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                takerOrder
            )
        );
        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[34]);
    });

    it("should revert as fill does not decrease size (reduce only)", async () => {
        const makerOrder = createOrder({
            makerAddress: alice.address,
            price: 26,
            quantity: 20
        });
        const takerOrder = createOrder({
            makerAddress: bob.address,
            isBuy: true,
            price: 26,
            quantity: 20,
            reduceOnly: true
        });

        const tx = await onChain.trade(
            await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                takerOrder
            )
        );

        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[39]);
    });

    it("should revert as maker/alice leverage is invalid", async () => {
        const makerOrder = createOrder({
            makerAddress: alice.address,
            isBuy: true,
            price: 26,
            quantity: 20,
            leverage: 0.9
        });
        const takerOrder = createOrder({
            makerAddress: bob.address,
            isBuy: false,
            price: 26,
            quantity: 20
        });

        const tx = await onChain.trade(
            await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                takerOrder
            )
        );

        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[40]);
    });

    it("should revert as taker/bob leverage is invalid", async () => {
        const makerOrder = createOrder({
            makerAddress: alice.address,
            isBuy: true,
            price: 26,
            quantity: 20,
            leverage: 1
        });
        const takerOrder = createOrder({
            makerAddress: bob.address,
            isBuy: false,
            price: 26,
            quantity: 20,
            leverage: 0.9
        });
        const tx = await onChain.trade(
            await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                takerOrder
            )
        );

        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[41]);
    });

    it("should revert as taker/bob order is being over filled", async () => {
        const makerOrder = createOrder({
            makerAddress: alice.address,
            price: 26,
            quantity: 20
        });
        const takerOrder = createOrder({
            makerAddress: bob.address,
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

        const tx = await onChain.trade(tradeParams);
        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[29]);
    });

    it("should revert as maker/alice order is being over filled", async () => {
        const makerOrder = createOrder({
            makerAddress: alice.address,
            price: 26,
            quantity: 15
        });

        const takerOrder = createOrder({
            makerAddress: bob.address,
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
        const tx = await onChain.trade(tradeParams);
        expectTxToFail(tx);
        expect(Transaction.getError(tx), ERROR_CODES[27]);
    });

    it("should revert as alice signature does not match the order", async () => {
        const makerOrder = createOrder({
            makerAddress: alice.address,
            price: 26,
            quantity: 20
        });

        const takerOrder = createOrder({
            makerAddress: bob.address,
            isBuy: true,
            price: 25,
            quantity: 20
        });

        const makerOrderSigned = new OrderSigner(alice.keyPair).getSignedOrder(
            makerOrder
        );

        const updatedMakerOrder = createOrder({
            makerAddress: alice.address,
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
            fillQuantity: toBigNumber(5)
        });

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse), ERROR_CODES[12]);
    });
});
