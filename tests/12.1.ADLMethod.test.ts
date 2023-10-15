import {
    DeploymentConfigs,
    getProvider,
    getSignerFromSeed,
    createOrder,
    OnChainCalls,
    OrderSigner,
    Transaction,
    ERROR_CODES,
    OWNERSHIP_ERROR,
    toBigNumber,
    toBigNumberStr,
    getTestAccounts,
    Trader,
    network,
    Order,
    UserPositionExtended,
    packageName,
    readFile,
    BASE_DECIMALS_ON_CHAIN
} from "../submodules/library-sui";
import {
    getMakerTakerAccounts,
    createAccount
} from "../tests/helpers/accounts";

import {
    expectTxToFail,
    expectTxToSucceed,
    expect,
    mintAndDeposit
} from "./helpers";

import {
    getGenesisMap,
    createMarket,
    packDeploymentData
} from "../src/deployment";

import { DEFAULT } from "../submodules/library-sui/src/defaults";
import { postDeployment, publishPackage } from "../src/helpers";
const provider = getProvider(network.rpc, network.faucet);

const pythObj = readFile("./pyth/priceInfoObject.json");

describe("Deleveraging Trade Method", () => {
    const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
    let onChain: OnChainCalls;
    let ownerAddress: string;
    let settlementCapID: string;

    const [alice, bob] = getTestAccounts(provider);

    const orderSigner = new OrderSigner(alice.keyPair);

    let order: Order;

    before(async () => {
        const publishTxn = await publishPackage(
            false,
            ownerSigner,
            packageName
        );
        const objects = await getGenesisMap(provider, publishTxn);
        let deploymentData = await packDeploymentData(ownerAddress, objects);
        const coinPackageId = deploymentData["objects"]["package"]["id"];
        deploymentData = await postDeployment(
            ownerSigner,
            deploymentData,
            coinPackageId
        );

        deploymentData["markets"]["ETH-PERP"] = {
            Objects: {},
            Config: {
                priceInfoFeedId:
                    pythObj["ETH-PERP"][process.env.DEPLOY_ON as string][
                        "feed_id"
                    ]
            }
        };

        // deploy market
        deploymentData["markets"]["ETH-PERP"].Objects = await createMarket(
            deploymentData,
            ownerSigner,
            provider,
            pythObj["ETH-PERP"][process.env.DEPLOY_ON as string]["object_id"],
            {
                priceInfoFeedId:
                    pythObj["ETH-PERP"][process.env.DEPLOY_ON as string][
                        "feed_id"
                    ]
            }
        );

        onChain = new OnChainCalls(ownerSigner, deploymentData);

        // will be using owner as liquidator
        ownerAddress = await ownerSigner.getAddress();

        // make owner, the settlement operator
        const txs = await onChain.createSettlementOperator(
            { operator: ownerAddress },
            ownerSigner
        );
        settlementCapID = Transaction.getCreatedObjectIDs(txs)[0];

        // set oracle price
        const priceTx = await onChain.setOraclePrice({
            price: 100
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
        const tx = await onChain.trade({ ...trade, settlementCapID });
        expectTxToSucceed(tx);
    });

    beforeEach(async () => {
        await onChain.setOraclePrice({
            price: 100
        });
    });

    it("should revert as only ADL operator can perform deleveraging trades", async () => {
        const error = OWNERSHIP_ERROR(
            onChain.getDeleveragingCapID(),
            ownerAddress,
            alice.address
        );

        await expect(
            onChain.deleverage(
                {
                    maker: DEFAULT.RANDOM_ACCOUNT_ADDRESS, // a random account with no position
                    taker: bob.address,
                    quantity: toBigNumberStr(1)
                },
                alice.signer
            )
        ).to.be.eventually.rejectedWith(error);
    });

    it("should revert as owner is no longer deleveraging operator", async () => {
        const publishTxn = await publishPackage(
            false,
            ownerSigner,
            packageName
        );
        const objects = await getGenesisMap(provider, publishTxn);
        let localDeployment = packDeploymentData(ownerAddress, objects);
        const coinPackageId = localDeployment["objects"]["package"]["id"];
        localDeployment = await postDeployment(
            ownerSigner,
            localDeployment,
            coinPackageId
        );

        localDeployment["markets"]["ETH-PERP"] = {
            Objects: {},
            Config: {
                priceInfoFeedId:
                    pythObj["ETH-PERP"][process.env.DEPLOY_ON as string][
                        "feed_id"
                    ]
            }
        };

        localDeployment["markets"]["ETH-PERP"].Objects = await createMarket(
            localDeployment,
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

        const onChainCaller = new OnChainCalls(ownerSigner, localDeployment);

        // made alice deleveraging operator
        await onChainCaller.setDeleveragingOperator({
            operator: alice.address
        });

        const txResponse = await onChainCaller.deleverage(
            {
                maker: DEFAULT.RANDOM_ACCOUNT_ADDRESS, // a random account with no position
                taker: bob.address,
                quantity: toBigNumberStr(1),
                deleveragingCapID: onChainCaller.getDeleveragingCapID(), // no longer the deleveraging operator
                gasBudget: 9000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[113]);
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
        const txResponse = await onChain.deleverage(
            {
                maker: accounts.maker.address,
                taker: accounts.taker.address,
                quantity: toBigNumberStr(1),
                gasBudget: 90000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[510]);
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
        const tx1 = await onChain.trade({ ...trade, settlementCapID });
        expectTxToSucceed(tx1);

        // close position for taker
        const trade2 = await Trader.setupNormalTrade(
            provider,
            orderSigner,
            accounts.taker.keyPair,
            tempTaker.keyPair,
            { ...order, maker: accounts.taker.address }
        );

        const tx2 = await onChain.trade({ ...trade2, settlementCapID });
        expectTxToSucceed(tx2);

        // try to deleverage
        const txResponse = await onChain.deleverage(
            {
                maker: accounts.maker.address,
                taker: accounts.taker.address, // taker has no position
                quantity: toBigNumberStr(1),
                gasBudget: 90000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[511]);
    });

    it("should revert as all or nothing flag is set and maker qPos < deleveraging quantity", async () => {
        const txResponse = await onChain.deleverage(
            {
                maker: alice.address,
                taker: bob.address,
                quantity: toBigNumberStr(2), // alice has only got 1 quantity
                allOrNothing: true,
                gasBudget: 90000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[803]);
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

        const tx1 = await onChain.trade({ ...trade, settlementCapID });
        expectTxToSucceed(tx1);

        const txResponse = await onChain.deleverage(
            {
                maker: accounts.maker.address,
                taker: bob.address,
                quantity: toBigNumberStr(2), // bob has only got 1 quantity
                allOrNothing: true,
                gasBudget: 90000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[804]);
    });

    it("should revert as quantity being deleverage < min allowed quantity ", async () => {
        const txResponse = await onChain.deleverage(
            {
                maker: alice.address,
                taker: bob.address,
                quantity: toBigNumberStr(0.01), // min quantity tradeable is 0.1
                gasBudget: 90000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[19]);
    });

    it("should revert as quantity to be deleveraged > max allowed limit quantity", async () => {
        const txResponse = await onChain.deleverage(
            {
                maker: alice.address,
                taker: bob.address,
                quantity: toBigNumberStr(500000), // max quantity tradeable for limit order is 100000
                gasBudget: 90000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[20]);
    });

    it("should revert as quantity to be deleveraged > max allowed market order size", async () => {
        const txResponse = await onChain.deleverage(
            {
                maker: alice.address,
                taker: bob.address,
                quantity: toBigNumberStr(2000), // max quantity tradeable for market order is 1000
                gasBudget: 90000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[21]);
    });

    it("should revert as maker(alice) is above mmr - can not be deleveraged", async () => {
        const txResponse = await onChain.deleverage(
            {
                maker: alice.address,
                taker: bob.address,
                quantity: toBigNumberStr(1),
                gasBudget: 90000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[800]);
    });

    it("should revert as maker(alice) is above under water - can not be deleveraged", async () => {
        await onChain.setOraclePrice({
            price: 92
        });

        const txResponse = await onChain.deleverage(
            {
                maker: alice.address,
                taker: bob.address,
                quantity: toBigNumberStr(1),
                gasBudget: 90000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[800]);
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

        const tx1 = await onChain.trade({ ...trade, settlementCapID });
        expectTxToSucceed(tx1);

        // at this price bob becomes under water and so does accounts.taker
        await onChain.setOraclePrice({
            price: 112
        });

        const txResponse = await onChain.deleverage(
            {
                maker: accounts.taker.address, // under water, can be maker
                taker: bob.address, // under water, can note be taker
                quantity: toBigNumberStr(1),
                gasBudget: 90000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[801]);
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

        const tx1 = await onChain.trade({ ...trade, settlementCapID });
        expectTxToSucceed(tx1);

        // at this price bob becomes under water
        await onChain.setOraclePrice({
            price: 112
        });

        const txResponse = await onChain.deleverage(
            {
                maker: bob.address, // under water, can be maker - has short position
                taker: accounts.taker.address, // above water so can be taker but has short position
                quantity: toBigNumberStr(1),
                gasBudget: 90000000
            },
            ownerSigner
        );

        expectTxToFail(txResponse);
        expect(Transaction.getError(txResponse)).to.be.equal(ERROR_CODES[802]);
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

        const tx1 = await onChain.trade({ ...trade, settlementCapID });
        expectTxToSucceed(tx1);

        // set oracle price to 89, alice becomes under water
        await onChain.setOraclePrice({
            price: 89
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

        const catPosition = Transaction.getAccountPosition(
            txResponse,
            accounts.maker.address
        ) as UserPositionExtended;

        const alicePosition = Transaction.getAccountPosition(
            txResponse,
            alice.address
        ) as UserPositionExtended;

        expect(catPosition.qPos).to.be.equal(
            toBigNumberStr(1, BASE_DECIMALS_ON_CHAIN)
        );
        expect(alicePosition.qPos).to.be.equal(
            toBigNumberStr(0, BASE_DECIMALS_ON_CHAIN)
        );
    });

    it("should successfully partially deleverage taker of adl trade", async () => {
        const publishTxn = await publishPackage(
            false,
            ownerSigner,
            packageName
        );
        const objects = await getGenesisMap(provider, publishTxn);
        let localDeployment = packDeploymentData(ownerAddress, objects);
        const coinPackageId = localDeployment["objects"]["package"]["id"];
        localDeployment = await postDeployment(
            ownerSigner,
            localDeployment,
            coinPackageId
        );

        localDeployment["markets"]["ETH-PERP"] = {
            Objects: {},
            Config: {
                priceInfoFeedId:
                    pythObj["ETH-PERP"][process.env.DEPLOY_ON as string][
                        "feed_id"
                    ]
            }
        };

        localDeployment["markets"]["ETH-PERP"].Objects = await createMarket(
            localDeployment,
            ownerSigner,
            provider,
            pythObj["ETH-PERP"][process.env.DEPLOY_ON as string]["object_id"],
            {
                priceInfoFeedId:
                    pythObj["ETH-PERP"][process.env.DEPLOY_ON as string][
                        "feed_id"
                    ]
            }
        );

        const onChainCaller = new OnChainCalls(ownerSigner, localDeployment);

        // make owner, the settlement operator
        const txs = await onChainCaller.createSettlementOperator(
            { operator: ownerAddress },
            ownerSigner
        );
        const settlementCapID = Transaction.getCreatedObjectIDs(txs)[0];

        await mintAndDeposit(onChainCaller, alice.address);
        await mintAndDeposit(onChainCaller, bob.address);
        await onChain.setOraclePrice({
            price: 100
        });

        const order = createOrder({
            market: onChainCaller.getPerpetualID(),
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

        const tx1 = await onChainCaller.trade({ ...trade1, settlementCapID });

        expectTxToSucceed(tx1);

        const accounts = getMakerTakerAccounts(provider, true);
        await mintAndDeposit(onChainCaller, accounts.maker.address);
        await mintAndDeposit(onChainCaller, accounts.taker.address);

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

        const tx2 = await onChainCaller.trade({ ...trade2, settlementCapID });
        expectTxToSucceed(tx2);

        // ==================================================

        // set oracle price to 115, taker/bob becomes under water
        await onChain.setOraclePrice({
            price: 115
        });

        const txResponse = await onChainCaller.deleverage(
            {
                maker: bob.address,
                taker: accounts.taker.address,
                quantity: toBigNumberStr(0.5)
            },
            ownerSigner
        );

        expectTxToSucceed(txResponse);

        const adlTakerPos = Transaction.getAccountPosition(
            txResponse,
            accounts.taker.address
        ) as UserPositionExtended;

        const bobPos = Transaction.getAccountPosition(
            txResponse,
            bob.address
        ) as UserPositionExtended;

        expect(adlTakerPos.qPos).to.be.equal(
            toBigNumberStr(1.5, BASE_DECIMALS_ON_CHAIN)
        );
        expect(bobPos.qPos).to.be.equal(
            toBigNumberStr(0.5, BASE_DECIMALS_ON_CHAIN)
        );
    });
});
