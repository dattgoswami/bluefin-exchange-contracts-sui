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
    network,
    getTestAccounts,
    base64ToHex,
    ERROR_CODES
} from "../submodules/library-sui";
import {
    expectTxToFail,
    expectTxToSucceed,
    expect,
    mintAndDeposit
} from "./helpers";

import { createMarket } from "../src/deployment";

const pythObj = readFile("./pyth/priceInfoObject.json");

const provider = getProvider(network.rpc, network.faucet);

describe("Order Cancellation", () => {
    const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
    const deployment = readFile(DeploymentConfigs.filePath);
    let ownerAddress: string;
    let onChain: OnChainCalls;

    const [alice, bob] = getTestAccounts(provider);
    const orderSigner = new OrderSigner(alice.keyPair);

    let settlementCapID: string;

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

        const orderHash = OrderSigner.getOrderHash(order);
        const sigPK = orderSigner.signOrder(order);

        const tx = await onChain.cancelOrder(
            { order, signature: sigPK.signature, publicKey: sigPK.publicKey },
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

        const sigPK = orderSigner.signOrder(order, alice.keyPair);

        const tester = getTestAccounts(provider)[7];

        const tx = await onChain.cancelOrder(
            {
                order,
                signature: sigPK.signature,
                publicKey: sigPK.publicKey,
                gasBudget: 500000000
            },
            tester.signer
        );
        expectTxToFail(tx);

        expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[52]);
    });

    it("should revert as order being traded has been cancelled", async () => {
        const order = createOrder({
            maker: alice.address,
            market: onChain.getPerpetualID()
        });

        const sigPK = orderSigner.signOrder(order);

        const tx = await onChain.cancelOrder(
            { order, signature: sigPK.signature, publicKey: sigPK.publicKey },
            alice.signer
        );
        expectTxToSucceed(tx);

        await mintAndDeposit(onChain, alice.address, 2000);
        await mintAndDeposit(onChain, bob.address, 2000);

        const priceTx = await onChain.setOraclePrice({
            price: 1
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
