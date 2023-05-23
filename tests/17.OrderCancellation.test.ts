import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfigs } from "../submodules/library-sui/src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getSignerFromSeed,
    createMarket,
    createOrder
} from "../submodules/library-sui/src/utils";
import { OnChainCalls, OrderSigner, Trader, Transaction } from "../submodules/library-sui/src/classes";
import { expectTxToFail, expectTxToSucceed } from "./helpers/expect";
import { getTestAccounts } from "./helpers/accounts";
import { network } from "../submodules/library-sui/src/DeploymentConfig";
import { base64ToHex, toBigNumberStr } from "../submodules/library-sui/src/library";
import { ERROR_CODES } from "../submodules/library-sui/src/errors";
import { mintAndDeposit } from "./helpers/utils";

chai.use(chaiAsPromised);
const expect = chai.expect;
const provider = getProvider(network.rpc, network.faucet);

describe("Order Cancellation", () => {
    const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
    const deployment = readFile(DeploymentConfigs.filePath);
    let ownerAddress: string;
    let onChain: OnChainCalls;

    const [alice, bob] = getTestAccounts(provider);
    const orderSigner = new OrderSigner(alice.keyPair);

    let priceOracleCapID: string;
    let settlementCapID: string;

    before(async () => {
        // deploy market
        deployment["markets"]["ETH-PERP"]["Objects"] = (
            await createMarket(deployment, ownerSigner, provider, {
                startingTime: Date.now() - 1000
            })
        ).marketObjects;
        onChain = new OnChainCalls(ownerSigner, deployment);
        ownerAddress = await ownerSigner.getAddress();

        const tx = await onChain.setPriceOracleOperator({
            operator: ownerAddress
        });

        priceOracleCapID = Transaction.getCreatedObjectIDs(tx)[0];

        // make admin operator
        const tx2 = await onChain.createSettlementOperator(
            { operator: ownerAddress },
            ownerSigner
        );
        settlementCapID = Transaction.getCreatedObjectIDs(tx2)[0];
    });

    it("should successfully cancel the order", async () => {
        const order = createOrder({
            maker: alice.address,
            market: onChain.getPerpetualID()
        });

        const orderHash = orderSigner.getOrderHash(order);
        const signature = orderSigner.signOrder(order);

        const tx = await onChain.cancelOrder(
            { order, signature },
            alice.signer
        );
        expectTxToSucceed(tx);

        const event = Transaction.getEvents(tx, "OrderCancel")[0];
        expect(event.caller).to.be.equal(alice.address);
        expect(event.sigMaker).to.be.equal(alice.address);
        expect(base64ToHex(event.orderHash)).to.be.equal(orderHash);
    });

    it("should revert as caller for cancellation is not order maker or its sub account", async () => {
        const order = createOrder({
            maker: alice.address,
            market: onChain.getPerpetualID()
        });

        const signature = orderSigner.signOrder(order);

        const tx = await onChain.cancelOrder(
            { order, signature, gasBudget: 5000000 },
            bob.signer
        );
        expectTxToFail(tx);

        expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[52]);
    });

    it("should revert as caller for cancellation is not order maker or its sub account", async () => {
        const order = createOrder({
            maker: alice.address,
            market: onChain.getPerpetualID()
        });

        const signature = orderSigner.signOrder(order);

        const tx = await onChain.cancelOrder(
            { order, signature, gasBudget: 5000000 },
            bob.signer
        );
        expectTxToFail(tx);

        expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[52]);
    });

    it("should revert as order being traded has been cancelled", async () => {
        const order = createOrder({
            maker: alice.address,
            market: onChain.getPerpetualID()
        });

        const signature = orderSigner.signOrder(order);

        const tx = await onChain.cancelOrder(
            { order, signature },
            alice.signer
        );
        expectTxToSucceed(tx);

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
            order
        );

        const tx2 = await onChain.trade({
            ...trade,
            settlementCapID,
            gasBudget: 900000000
        });
        expectTxToFail(tx2);
        expect(Transaction.getError(tx2)).to.be.equal(ERROR_CODES[28]);
    });
});
