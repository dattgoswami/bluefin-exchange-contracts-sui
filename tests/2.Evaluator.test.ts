import {
    DeploymentConfigs,
    OnChainCalls,
    Transaction,
    OrderSigner,
    Trader,
    readFile,
    getProvider,
    getSignerFromSeed,
    createMarket,
    createOrder,
    requestGas,
    toBigNumberStr,
    toBigNumber,
    ERROR_CODES,
    OWNERSHIP_ERROR,
    getTestAccounts,
    TEST_WALLETS
} from "../submodules/library-sui";

import {
    fundTestAccounts,
    mintAndDeposit,
    expectTxToSucceed,
    expectTxToFail,
    expect
} from "./helpers";

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);

const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

describe("Evaluator", () => {
    const deployment = readFile(DeploymentConfigs.filePath);
    let onChain: OnChainCalls;
    let ownerAddress: string;
    const [alice, bob] = getTestAccounts(provider);
    const orderSigner = new OrderSigner(alice.keyPair);
    let settlementCapID: string;
    let priceOracleCapID: string;

    before(async () => {
        ownerAddress = await ownerSigner.getAddress();

        await requestGas(ownerAddress);
        await fundTestAccounts();

        onChain = new OnChainCalls(ownerSigner, deployment);

        // make owner, the price oracle operator
        const tx = await onChain.setPriceOracleOperator({
            operator: ownerAddress
        });

        priceOracleCapID = Transaction.getCreatedObjectIDs(tx)[0];

        const tx2 = await onChain.createSettlementOperator(
            { operator: ownerAddress },
            ownerSigner
        );

        settlementCapID = Transaction.getCreatedObjectIDs(tx2)[0];

        await mintAndDeposit(onChain, alice.address, 30000000);
        await mintAndDeposit(onChain, bob.address, 30000000);
    });

    // deploy the market again before each test
    beforeEach(async () => {
        deployment["markets"]["ETH-PERP"]["Objects"] = await createMarket(
            deployment,
            ownerSigner,
            provider,
            {
                tradingStartTime: Date.now() - 1000
            },
            deployment["markets"]["ETH-PERP"]["Objects"]["PriceOracle"]["id"]
        );

        onChain = new OnChainCalls(ownerSigner, deployment);
    });

    describe("Price", async () => {
        it("should set min price to 0.2", async () => {
            const tx = await onChain.setMinPrice({ minPrice: 0.02 });
            expectTxToSucceed(tx);
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );

            expect(details.checks.fields["minPrice"]).to.be.equal(
                toBigNumberStr(0.02)
            );
        });

        it("should revert as min price can not be set to zero", async () => {
            const tx = await onChain.setMinPrice({
                minPrice: 0,
                gasBudget: 9000000
            });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[1]);
        });

        it("should revert as min price can not be > max price", async () => {
            const tx = await onChain.setMinPrice({
                minPrice: 1_000_000,
                gasBudget: 9000000
            });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[2]);
        });

        it("should revert when non-admin account tries to set min price", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setMinPrice({ minPrice: 0.5 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });

        it("should set max price to 10000", async () => {
            await onChain.setMaxPrice({ maxPrice: 20000 });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            expect(details.checks.fields["maxPrice"]).to.be.equal(
                toBigNumberStr(20000)
            );
        });

        it("should revert when setting max price < min price", async () => {
            await onChain.setMinPrice({ minPrice: 0.5 });
            const tx = await onChain.setMaxPrice({
                maxPrice: 0.2,
                gasBudget: 9000000
            });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[9]);
        });

        it("should revert when non-admin account tries to set max price", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setMaxPrice({ maxPrice: 10000 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });

        it("should set tick size to 0.1", async () => {
            await onChain.setTickSize({ tickSize: 0.1 });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            expect(details.checks.fields["tickSize"]).to.be.equal(
                toBigNumberStr(0.1)
            );
        });

        it("should revert when trying to set tick size as 0", async () => {
            const tx = await onChain.setTickSize({
                tickSize: 0,
                gasBudget: 9000000
            });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[11]);
        });

        it("should revert when non-admin account tries to set tick size", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setTickSize({ tickSize: 0.1 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });

        it("should revert trade as trade price is < min price", async () => {
            await onChain.setMinPrice({ minPrice: 1 });
            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(26),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 0.1,
                quantity: 15,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                isBuy: true,
                price: 0.1,
                quantity: 15,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(15) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID,
                gasBudget: 900000000
            });
            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[3]);
        });

        it("should revert trade as trade price is > max price", async () => {
            await onChain.setMaxPrice({ maxPrice: 100 });
            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(100),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 101,
                quantity: 15,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                isBuy: true,
                price: 101,
                quantity: 15,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(15) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID,
                gasBudget: 900000000
            });
            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[4]);
        });

        it("should revert trade as trade price does not confirm to tick size # 1", async () => {
            await onChain.setTickSize({ tickSize: 0.1 });
            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(10),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 10.12,
                quantity: 15,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                isBuy: true,
                price: 10.12,
                quantity: 15,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(15) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID,
                gasBudget: 900000000
            });
            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[5]);
        });

        it("should revert trade as trade price does not confirm to tick size # 2", async () => {
            await onChain.setTickSize({ tickSize: 0.01 });
            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(10),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 10.123,
                quantity: 15,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                isBuy: true,
                price: 10.123,
                quantity: 15,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(15) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID,
                gasBudget: 900000000
            });
            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[5]);
        });
        it("should successfully execute the trade when all price checks are met", async () => {
            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(10),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 10,
                quantity: 20,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                isBuy: true,
                price: 10,
                quantity: 20,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(10) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID
            });
            expectTxToSucceed(tx);
        });
    });

    describe("Quantity", async () => {
        it("should set maximum quantity (limit) as 20000", async () => {
            await onChain.setMaxQtyLimit({ maxQtyLimit: 20000 });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            expect(details.checks.fields.maxQtyLimit).to.be.equal(
                toBigNumberStr(20000)
            );
        });
        it("should set maximum quantity (market) as 20000", async () => {
            await onChain.setMaxQtyMarket({ maxQtyMarket: 20000 });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            expect(details.checks.fields.maxQtyMarket).to.be.equal(
                toBigNumberStr(20000)
            );
        });
        it("should revert when trying to set maximum quantity for limit trade < minimum trade quantity", async () => {
            const tx = await onChain.setMaxQtyLimit({
                maxQtyLimit: 0.001,
                gasBudget: 90000000
            });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[15]);
        });

        it("should revert when trying to set maximum quantity for market trade < minimum trade quantity", async () => {
            const tx = await onChain.setMaxQtyMarket({
                maxQtyMarket: 0.001,
                gasBudget: 90000000
            });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[16]);
        });

        it("should revert when non-admin account tries to set maximum quantity (limit)", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setMaxQtyLimit({ maxQtyLimit: 20000 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });

        it("should revert when non-admin account tries to set maximum quantity (market)", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setMTBLong({ mtbLong: 0.2 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });

        it("should revert when trying to set minimum quantity  as 0", async () => {
            const tx = await onChain.setMinQty({
                minQty: 0,
                gasBudget: 90000000
            });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[18]);
        });

        it("should revert when non-admin account tries to set minimum quantity", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setMinQty({ minQty: 0.02 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });

        it("should set step size to 0.1", async () => {
            await onChain.setStepSize({ stepSize: 0.1 });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            expect(details.checks.fields.stepSize).to.be.equal(
                toBigNumberStr(0.1)
            );
        });

        it("should revert when trying to set step size as 0", async () => {
            const tx = await onChain.setStepSize({
                stepSize: 0,
                gasBudget: 90000000
            });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[10]);
        });

        it("should revert when non-admin account tries to set step size", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setStepSize({ stepSize: 0.1 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });

        it("should revert trade as trade quantity is < min trade quantity", async () => {
            await onChain.setMinQty({ minQty: 0.1 });
            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(10),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 10,
                quantity: 10,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                isBuy: true,
                price: 10,
                quantity: 10,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(0.01) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID,
                gasBudget: 90000000
            });
            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[19]);
        });

        it("should revert trade as trade quantity is > max trade quantity (limit)", async () => {
            await onChain.setMaxQtyLimit({ maxQtyLimit: 100 });
            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(10),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 10,
                quantity: 200,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                isBuy: true,
                price: 10,
                quantity: 200,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(101) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID,
                gasBudget: 90000000
            });
            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[20]);
        });

        it("should revert trade as trade quantity is > max trade quantity (market)", async () => {
            await onChain.setMaxQtyMarket({ maxQtyMarket: 50 });
            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(10),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 10,
                quantity: 100,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                isBuy: true,
                price: 10,
                quantity: 100,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(51) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID,
                gasBudget: 90000000
            });
            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[21]);
        });

        it("should revert trade as trade quantity does not conform to step size # 1", async () => {
            await onChain.setStepSize({ stepSize: 0.1 });
            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(10),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 10,
                quantity: 20,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                isBuy: true,
                price: 10,
                quantity: 20,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(10.12) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID,
                gasBudget: 90000000
            });
            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[22]);
        });

        it("should revert trade as trade quantity does not conform to step size # 2", async () => {
            await onChain.setStepSize({ stepSize: 0.01 });
            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(10),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 10,
                quantity: 20,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                isBuy: true,
                price: 10,
                quantity: 20,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(10.123) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID,
                gasBudget: 90000000
            });
            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[22]);
        });

        it("should successfully execute the trade when all quantity checks are met", async () => {
            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(10),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 10,
                quantity: 20,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                isBuy: true,
                price: 10,
                quantity: 20,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(10) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID,
                gasBudget: 900000000
            });
            expectTxToSucceed(tx);
        });
    });

    describe("Market Take Bounds", async () => {
        it("should revert when trying to set market take bound (long) as 0", async () => {
            const tx = await onChain.setMTBLong({
                mtbLong: 0,
                gasBudget: 90000000
            });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[12]);
        });

        it("should revert when trying to set market take bound (short) as 0", async () => {
            const tx = await onChain.setMTBShort({
                mtbShort: 0,
                gasBudget: 90000000
            });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[13]);
        });

        it("should revert when trying to set market take bound (short) > 100%", async () => {
            const tx = await onChain.setMTBShort({
                mtbShort: 2,
                gasBudget: 90000000
            });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[14]);
        });

        it("should set market take bound (long) to 20%", async () => {
            await onChain.setMTBLong({ mtbLong: 0.2, gasBudget: 90000000 });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            expect(details.checks.fields["mtbLong"]).to.be.equal(
                toBigNumberStr(0.2)
            );
        });

        it("should revert when trying to set market take bound (long) as 0", async () => {
            const tx = await onChain.setMTBLong({
                mtbLong: 0,
                gasBudget: 90000000
            });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[12]);
        });

        it("should revert when non-admin account tries to set market take bound (long)", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setMTBLong({ mtbLong: 0.2 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });

        it("should set market take bound (short) to 20%", async () => {
            await onChain.setMTBShort({ mtbShort: 0.2 });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            expect(details.checks.fields["mtbShort"]).to.be.equal(
                toBigNumberStr(0.2)
            );
        });

        it("should revert when trying to set market take bound (short) as 0", async () => {
            const tx = await onChain.setMTBShort({
                mtbShort: 0,
                gasBudget: 90000000
            });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[13]);
        });

        it("should revert when trying to set market take bound (short) > 100%", async () => {
            const tx = await onChain.setMTBShort({
                mtbShort: 2,
                gasBudget: 90000000
            });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[14]);
        });

        it("should revert when non-admin account tries to set market take bound (short)", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setMTBShort({ mtbShort: 0.2 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });
        it("should revert when trying to trade at price < short take bound", async () => {
            await onChain.setMTBShort({ mtbShort: 0.2, gasBudget: 90000000 });
            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(20),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 15,
                quantity: 20,
                isBuy: true,
                market: onChain.getPerpetualID()
            });

            // Taker Order with short side and price (15) < MTB short (0.8 x oraclePrice)
            const takerOrder = createOrder({
                maker: bob.address,
                price: 15,
                quantity: 20,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(10) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID,
                gasBudget: 90000000
            });
            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[24]);
        });
        it("should successfully trade when trying to trade at price > long take bound when taker is going short", async () => {
            await onChain.setMTBShort({ mtbShort: 0.2 });
            await onChain.setMTBLong({ mtbLong: 0.2 }); // 20%
            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(20),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 30,
                quantity: 20,
                isBuy: true,
                market: onChain.getPerpetualID()
            });

            // Taker Order with short side and price (30) > MTB long (1.2 x oraclePrice)
            const takerOrder = createOrder({
                maker: bob.address,
                price: 30,
                quantity: 20,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(10) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID
            });
            expectTxToSucceed(tx);
        });
        it("should revert when trying to trade at price > long take bound", async () => {
            await onChain.setMTBLong({ mtbLong: 0.2 });
            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(20),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 30,
                quantity: 20,
                market: onChain.getPerpetualID()
            });

            // Taker Order with long side and price (30) > MTB long (1.2 x oraclePrice)
            const takerOrder = createOrder({
                maker: bob.address,
                price: 30,
                isBuy: true,
                quantity: 20,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(10) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID,
                gasBudget: 90000000
            });
            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[23]);
        });
        it("should successfully trade when trying to trade at price < short take bound when taker is going long", async () => {
            await onChain.setMTBLong({ mtbLong: 0.2 });
            await onChain.setMTBShort({ mtbShort: 0.2 }); // 20 %
            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(20),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 15,
                quantity: 20,
                market: onChain.getPerpetualID()
            });

            // Taker Order with long side and price (15) < MTB short (0.8 x oraclePrice)
            const takerOrder = createOrder({
                maker: bob.address,
                price: 15,
                isBuy: true,
                quantity: 20,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(10) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID
            });
            expectTxToSucceed(tx);
        });
    });

    describe("OI Open", async () => {
        it("should set max Allowed OI Open values", async () => {
            const maxLimit = [];
            maxLimit.push(toBigNumberStr(10000));
            maxLimit.push(toBigNumberStr(20000));
            maxLimit.push(toBigNumberStr(30000));
            await onChain.setMaxAllowedOIOpen({ maxLimit });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            maxLimit.unshift(toBigNumberStr(0));
            expect(details.checks.fields["maxAllowedOIOpen"]).deep.equal(
                maxLimit
            );
        });

        it("should revert when non-admin account tries to max Allowed OI Open values", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            const maxLimit = [];
            maxLimit.push(toBigNumberStr(10000));
            maxLimit.push(toBigNumberStr(20000));
            maxLimit.push(toBigNumberStr(30000));
            await expect(
                onChain.setMaxAllowedOIOpen({ maxLimit }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });
        it("should open a position at 5x leverage with 300K OI Open as there are no oi open thresholds set for leverages > 3", async () => {
            const maxLimit = [];
            maxLimit.push(toBigNumberStr(1_000_000)); //1x
            maxLimit.push(toBigNumberStr(1_000_000)); //2x
            maxLimit.push(toBigNumberStr(500_000)); //3x

            await onChain.setMaxAllowedOIOpen({ maxLimit });

            await onChain.setMaxQtyMarket({ maxQtyMarket: 300000 });

            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(10),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 10,
                leverage: 5,
                quantity: 30000,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                price: 10,
                isBuy: true,
                leverage: 5,
                quantity: 30000,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(30000) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID
            });
            expectTxToSucceed(tx);
        });

        it("should open a position at 5x leverage with 300K OI Open as there are no oi open thresholds set for leverages > 3", async () => {
            const maxLimit = [];
            maxLimit.push(toBigNumberStr(1_000_000)); //1x
            maxLimit.push(toBigNumberStr(1_000_000)); //2x
            maxLimit.push(toBigNumberStr(500_000)); //3x
            maxLimit.push(toBigNumberStr(500_000)); //4x
            maxLimit.push(toBigNumberStr(500_000)); //5x
            await onChain.setMaxAllowedOIOpen({ maxLimit });
            await onChain.setMaxQtyMarket({ maxQtyMarket: 300000 });

            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(10),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 10,
                leverage: 5,
                quantity: 30000,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                price: 10,
                isBuy: true,
                leverage: 5,
                quantity: 30000,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(30000) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID
            });
            expectTxToSucceed(tx);
        });

        it("should revert when trying to open 300K OI open position at 5x", async () => {
            const maxLimit = [];
            maxLimit.push(toBigNumberStr(1_000_000)); //1x
            maxLimit.push(toBigNumberStr(1_000_000)); //2x
            maxLimit.push(toBigNumberStr(500_000)); //3x
            maxLimit.push(toBigNumberStr(500_000)); //4x
            maxLimit.push(toBigNumberStr(250_000)); //5x
            await onChain.setMaxAllowedOIOpen({ maxLimit });

            await onChain.setMaxQtyMarket({ maxQtyMarket: 300000 });

            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(10),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 10,
                leverage: 5,
                quantity: 30000,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                price: 10,
                isBuy: true,
                leverage: 5,
                quantity: 30000,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(30000) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID,
                gasBudget: 90000000
            });
            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[25]);
        });

        it("should revert when trying to adjust leverage as OI Open goes max allowed OI Open for newly selected leverage", async () => {
            const maxLimit = [];
            maxLimit.push(toBigNumberStr(1_000_000)); //1x
            maxLimit.push(toBigNumberStr(1_000_000)); //2x
            maxLimit.push(toBigNumberStr(500_000)); //3x
            maxLimit.push(toBigNumberStr(500_000)); //4x
            maxLimit.push(toBigNumberStr(250_000)); //5x
            maxLimit.push(toBigNumberStr(250_000)); //6x
            maxLimit.push(toBigNumberStr(250_000)); //7x
            maxLimit.push(toBigNumberStr(250_000)); //8x
            maxLimit.push(toBigNumberStr(100_000)); //9x
            maxLimit.push(toBigNumberStr(100_000)); //10x

            await onChain.setMaxAllowedOIOpen({ maxLimit });
            await onChain.setMaxQtyMarket({ maxQtyMarket: 300000 });

            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(10),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 10,
                leverage: 5,
                quantity: 25_000,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                price: 10,
                isBuy: true,
                leverage: 5,
                quantity: 25_000,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(25_000) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID
            });
            expectTxToSucceed(tx);
            const tx2 = await onChain.adjustLeverage(
                { leverage: 9, account: alice.address, gasBudget: 90000000 },
                alice.signer
            );
            expectTxToFail(tx2);
            expect(Transaction.getError(tx2)).to.be.equal(ERROR_CODES[25]);
        });

        it("should revert when trying to increase position when OI open after increasing position is > max allowed oi open", async () => {
            const maxLimit = [];
            maxLimit.push(toBigNumberStr(1_000_000)); //1x
            maxLimit.push(toBigNumberStr(1_000_000)); //2x
            maxLimit.push(toBigNumberStr(500_000)); //3x
            maxLimit.push(toBigNumberStr(500_000)); //4x
            maxLimit.push(toBigNumberStr(250_000)); //5x
            maxLimit.push(toBigNumberStr(250_000)); //6x

            await onChain.setMaxAllowedOIOpen({ maxLimit });
            await onChain.setMaxQtyMarket({ maxQtyMarket: 1_000_000 });

            const priceTx = await onChain.updateOraclePrice({
                price: toBigNumberStr(10),
                updateOPCapID: priceOracleCapID
            });

            expectTxToSucceed(priceTx);

            const makerOrder = createOrder({
                maker: alice.address,
                price: 10,
                leverage: 5,
                quantity: 23_000,
                market: onChain.getPerpetualID()
            });

            const takerOrder = createOrder({
                maker: bob.address,
                price: 10,
                isBuy: true,
                leverage: 5,
                quantity: 23_000,
                market: onChain.getPerpetualID()
            });

            const tradeParams = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder,
                { takerOrder, quantity: toBigNumber(23_000) }
            );
            const tx = await onChain.trade({
                ...tradeParams,
                settlementCapID
            });
            expectTxToSucceed(tx);

            // Creating new trade to increase the position size
            const makerOrder2 = createOrder({
                maker: alice.address,
                price: 10,
                leverage: 5,
                quantity: 3000,
                market: onChain.getPerpetualID()
            });

            const takerOrder2 = createOrder({
                maker: bob.address,
                price: 10,
                isBuy: true,
                leverage: 5,
                quantity: 3000,
                market: onChain.getPerpetualID()
            });

            const tradeParams2 = await Trader.setupNormalTrade(
                provider,
                orderSigner,
                alice.keyPair,
                bob.keyPair,
                makerOrder2,
                { takerOrder: takerOrder2, quantity: toBigNumber(2001) }
            );
            const tx2 = await onChain.trade({
                ...tradeParams2,
                settlementCapID,
                gasBudget: 90000000
            });

            expectTxToFail(tx2);
            expect(Transaction.getError(tx2)).to.be.equal(ERROR_CODES[25]);
        });
    });
});
