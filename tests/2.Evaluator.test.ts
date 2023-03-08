import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfigs } from "../src/DeploymentConfig";
import { OnChainCalls, Transaction } from "../src/classes";
import {
    readFile,
    getProvider,
    getAddressFromSigner,
    getSignerFromSeed,
    createMarket
} from "../src/utils";
import { ERROR_CODES, OWNERSHIP_ERROR } from "../src/errors";
import { toBigNumberStr } from "../src/library";
import { TEST_WALLETS } from "./helpers/accounts";
import { fundTestAccounts } from "./helpers/utils";
import { expectTxToSucceed } from "./helpers/expect";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);

const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

describe("Evaluator", () => {
    const deployment = readFile(DeploymentConfigs.filePath);
    let onChain: OnChainCalls;
    let ownerAddress: string;

    before(async () => {
        await fundTestAccounts();
        ownerAddress = await getAddressFromSigner(ownerSigner);
    });

    // deploy the market again before each test
    beforeEach(async () => {
        deployment["markets"]["ETH-PERP"]["Objects"] = (
            await createMarket(deployment, ownerSigner, provider)
        ).marketObjects;

        onChain = new OnChainCalls(ownerSigner, deployment);
    });

    describe("Setters", async () => {
        describe("Price", async () => {
            it("should set min price to 0.2", async () => {
                await onChain.setMinPrice({ minPrice: 0.02 });
                const details = await onChain.getPerpDetails(
                    onChain.getPerpetualID()
                );
                expect(details.checks["fields"]["minPrice"]).to.be.equal(
                    toBigNumberStr(0.02)
                );
            });

            it("should revert as min price can not be set to zero", async () => {
                const tx = await onChain.setMinPrice({ minPrice: 0 });
                expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[1]);
            });

            it("should revert as min price can not be > max price", async () => {
                const tx = await onChain.setMinPrice({ minPrice: 1_000_000 });
                expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[2]);
            });

            it("should revert when non-admin account tries to set min price", async () => {
                const alice = getSignerFromSeed(
                    TEST_WALLETS[0].phrase,
                    provider
                );
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
                expect(details.checks["fields"]["maxPrice"]).to.be.equal(
                    toBigNumberStr(20000)
                );
            });

            it("should revert when setting max price < min price", async () => {
                await onChain.setMinPrice({ minPrice: 0.5 });
                const tx = await onChain.setMaxPrice({ maxPrice: 0.2 });
                expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[9]);
            });

            it("should revert when non-admin account tries to set max price", async () => {
                const alice = getSignerFromSeed(
                    TEST_WALLETS[0].phrase,
                    provider
                );
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
                expect(
                    (details.checks as any)["fields"]["tickSize"]
                ).to.be.equal(toBigNumberStr(0.1));
            });

            it("should revert when trying to set tick size as 0", async () => {
                const tx = await onChain.setTickSize({ tickSize: 0 });
                expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[11]);
            });

            it("should revert when non-admin account tries to set tick size", async () => {
                const alice = getSignerFromSeed(
                    TEST_WALLETS[0].phrase,
                    provider
                );
                const expectedError = OWNERSHIP_ERROR(
                    onChain.getExchangeAdminCap(),
                    ownerAddress,
                    TEST_WALLETS[0].address
                );
                await expect(
                    onChain.setTickSize({ tickSize: 0.1 }, alice)
                ).to.eventually.be.rejectedWith(expectedError);
            });
        });

        describe("Quantity", async () => {
            it("should set maximum quantity (limit) as 20000", async () => {
                await onChain.setMaxQtyLimit({ maxQtyLimit: 20000 });
                const details = await onChain.getPerpDetails(
                    onChain.getPerpetualID()
                );
                expect(
                    (details.checks as any)["fields"]["maxQtyLimit"]
                ).to.be.equal(toBigNumberStr(20000));
            });

            it("should revert when trying to set maximum quantity for limit trade < minimum trade quantity", async () => {
                const tx = await onChain.setMaxQtyLimit({ maxQtyLimit: 0.001 });
                expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[15]);
            });

            it("should revert when non-admin account tries to set maximum quantity (limit)", async () => {
                const alice = getSignerFromSeed(
                    TEST_WALLETS[0].phrase,
                    provider
                );
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
                const alice = getSignerFromSeed(
                    TEST_WALLETS[0].phrase,
                    provider
                );
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
                const tx = await onChain.setMinQty({ minQty: 0 });
                expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[18]);
            });

            it("should revert when non-admin account tries to set minimum quantity", async () => {
                const alice = getSignerFromSeed(
                    TEST_WALLETS[0].phrase,
                    provider
                );
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
                expect(
                    (details.checks as any)["fields"]["stepSize"]
                ).to.be.equal(toBigNumberStr(0.1));
            });

            it("should revert when trying to set step size as 0", async () => {
                const tx = await onChain.setStepSize({ stepSize: 0 });
                expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[10]);
            });

            it("should revert when non-admin account tries to set step size", async () => {
                const alice = getSignerFromSeed(
                    TEST_WALLETS[0].phrase,
                    provider
                );
                const expectedError = OWNERSHIP_ERROR(
                    onChain.getExchangeAdminCap(),
                    ownerAddress,
                    TEST_WALLETS[0].address
                );
                await expect(
                    onChain.setStepSize({ stepSize: 0.1 }, alice)
                ).to.eventually.be.rejectedWith(expectedError);
            });
        });

        describe("Market Take Bounds", async () => {
            it("should revert when trying to set market take bound (long) as 0", async () => {
                const tx = await onChain.setMTBLong({ mtbLong: 0 });
                expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[12]);
            });

            it("should revert when trying to set market take bound (short) as 0", async () => {
                const tx = await onChain.setMTBShort({ mtbShort: 0 });
                expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[13]);
            });

            it("should revert when trying to set market take bound (short) > 100%", async () => {
                const tx = await onChain.setMTBShort({ mtbShort: 2 });
                expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[14]);
            });

            it("should set market take bound (long) to 20%", async () => {
                await onChain.setMTBLong({ mtbLong: 0.2 });
                const details = await onChain.getPerpDetails(
                    onChain.getPerpetualID()
                );
                expect(
                    (details.checks as any)["fields"]["mtbLong"]
                ).to.be.equal(toBigNumberStr(0.2));
            });

            it("should revert when trying to set market take bound (long) as 0", async () => {
                const tx = await onChain.setMTBLong({ mtbLong: 0 });
                expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[12]);
            });

            it("should revert when non-admin account tries to set market take bound (long)", async () => {
                const alice = getSignerFromSeed(
                    TEST_WALLETS[0].phrase,
                    provider
                );
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
                expect(
                    (details.checks as any)["fields"]["mtbShort"]
                ).to.be.equal(toBigNumberStr(0.2));
            });

            it("should revert when trying to set market take bound (short) as 0", async () => {
                const tx = await onChain.setMTBShort({ mtbShort: 0 });
                expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[13]);
            });

            it("should revert when trying to set market take bound (short) > 100%", async () => {
                const tx = await onChain.setMTBShort({ mtbShort: 2 });
                expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[14]);
            });

            it("should revert when non-admin account tries to set market take bound (short)", async () => {
                const alice = getSignerFromSeed(
                    TEST_WALLETS[0].phrase,
                    provider
                );
                const expectedError = OWNERSHIP_ERROR(
                    onChain.getExchangeAdminCap(),
                    ownerAddress,
                    TEST_WALLETS[0].address
                );
                await expect(
                    onChain.setMTBShort({ mtbShort: 0.2 }, alice)
                ).to.eventually.be.rejectedWith(expectedError);
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
                expect(
                    (details.checks as any)["fields"]["maxAllowedOIOpen"]
                ).deep.equal(maxLimit);
            });

            it("should revert when non-admin account tries to max Allowed OI Open values", async () => {
                const alice = getSignerFromSeed(
                    TEST_WALLETS[0].phrase,
                    provider
                );
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
        });
    });
});
