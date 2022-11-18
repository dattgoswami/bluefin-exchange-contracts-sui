import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfig } from "../src/DeploymentConfig";
import { OnChainCalls, Transaction } from "../src/classes";
import {
    readFile,
    getProvider,
    getSignerSUIAddress,
    getSignerFromSeed
} from "../src/utils";
import { ERROR_CODES, OWNERSHIP_ERROR } from "../src/errors";
import { toBigNumber } from "../src/library";
import { TEST_WALLETS } from "./helpers/accounts";
import { test_deploy_market } from "./helpers/utils";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfig.rpcURL,
    DeploymentConfig.faucetURL
);

const ownerSigner = getSignerFromSeed(DeploymentConfig.deployer, provider);

describe("Evaluator", () => {
    let deployment = readFile(DeploymentConfig.filePath);
    let onChain: OnChainCalls;
    let ownerAddress: string;

    before(async () => {
        ownerAddress = await getSignerSUIAddress(ownerSigner);
    });

    // deploy the market again before each test
    beforeEach(async () => {
        deployment["markets"] = [
            await test_deploy_market(deployment, ownerSigner, provider)
        ];
        onChain = new OnChainCalls(ownerSigner, deployment);
    });

    describe("Price", async () => {
        it("should set min price to 0.2", async () => {
            await onChain.setMinPrice({ minPrice: 0.02 });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            expect((details.checks as any)["fields"]["minPrice"]).to.be.equal(
                toBigNumber(0.02).toNumber()
            );
        });

        it("should revert as min price can not be set to zero", async () => {
            const tx = await onChain.setMinPrice({ minPrice: 0 });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[1]);
        });

        it("should revert as min price can be > max price", async () => {
            const tx = await onChain.setMinPrice({ minPrice: 1_000_000 });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[2]);
        });

        it("should revert when non-admin account tries to set min price", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getAdminCap(),
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
            expect((details.checks as any)["fields"]["maxPrice"]).to.be.equal(
                toBigNumber(20000).toNumber()
            );
        });

        it("should revert when setting max price < min price", async () => {
            await onChain.setMinPrice({ minPrice: 0.5 });
            const tx = await onChain.setMaxPrice({ maxPrice: 0.2 });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[9]);
        });

        it("should revert when non-admin account tries to set max price", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setMaxPrice({ maxPrice: 10000 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });

        it("should set step size to 0.1", async () => {
            await onChain.setStepSize({ stepSize: 0.1 });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            expect((details.checks as any)["fields"]["stepSize"]).to.be.equal(
                toBigNumber(0.1).toNumber()
            );
        });

        it("should revert when trying to set step size as 0", async () => {
            const tx = await onChain.setStepSize({ stepSize: 0 });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[10]);
        });

        it("should revert when non-admin account tries to set step size", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setStepSize({ stepSize: 0.1 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });

        it("should set tick size to 0.1", async () => {
            await onChain.setTickSize({ tickSize: 0.1 });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            expect((details.checks as any)["fields"]["tickSize"]).to.be.equal(
                toBigNumber(0.1).toNumber()
            );
        });

        it("should revert when trying to set tick size as 0", async () => {
            const tx = await onChain.setTickSize({ tickSize: 0 });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[11]);
        });

        it("should revert when non-admin account tries to set tick size", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setTickSize({ tickSize: 0.1 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });

        it("should set market take bound (long) to 20%", async () => {
            await onChain.setMtbLong({ mtbLong: 0.2 });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            expect((details.checks as any)["fields"]["mtbLong"]).to.be.equal(
                toBigNumber(0.2).toNumber()
            );
        });

        it("should revert when trying to set market take bound (long) as 0", async () => {
            const tx = await onChain.setMtbLong({ mtbLong: 0 });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[12]);
        });

        it("should revert when non-admin account tries to set market take bound (long)", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setMtbLong({ mtbLong: 0.2 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });

        it("should set market take bound (short) to 20%", async () => {
            await onChain.setMtbShort({ mtbShort: 0.2 });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            expect((details.checks as any)["fields"]["mtbShort"]).to.be.equal(
                toBigNumber(0.2).toNumber()
            );
        });

        it("should revert when trying to set market take bound (short) as 0", async () => {
            const tx = await onChain.setMtbShort({ mtbShort: 0 });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[13]);
        });

        it("should revert when trying to set market take bound (short) > 100%", async () => {
            const tx = await onChain.setMtbShort({ mtbShort: 2 });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[14]);
        });

        it("should revert when non-admin account tries to set market take bound (short)", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setMtbShort({ mtbShort: 0.2 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });

        it("should set maximum quantity (limit) as 20000", async () => {
            await onChain.setMaxQtyLimit({ maxQtyLimit: 20000 });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            expect(
                (details.checks as any)["fields"]["maxQtyLimit"]
            ).to.be.equal(toBigNumber(20000).toNumber());
        });

        it("should revert when trying to set maximum quantity for limit trade < minimum trade quantity", async () => {
            const tx = await onChain.setMaxQtyLimit({ maxQtyLimit: 0.001 });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[15]);
        });

        it("should revert when non-admin account tries to set maximum quantity (limit)", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setMaxQtyLimit({ maxQtyLimit: 20000 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });

        it("should set maximum quantity (market) as 20000", async () => {
            await onChain.setMaxQtyMarket({ maxQtyMarket: 20000 });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            expect(
                (details.checks as any)["fields"]["maxQtyMarket"]
            ).to.be.equal(toBigNumber(20000).toNumber());
        });

        it("should revert when trying to set maximum quantity for market trade < minimum trade quantity", async () => {
            const tx = await onChain.setMaxQtyMarket({ maxQtyMarket: 0.001 });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[16]);
        });

        it("should revert when non-admin account tries to set maximum quantity (market)", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setMaxQtyMarket({ maxQtyMarket: 2000 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });

        it("should set minimum quantity as 0.02", async () => {
            await onChain.setMinQty({ minQty: 0.02 });
            const details = await onChain.getPerpDetails(
                onChain.getPerpetualID()
            );
            expect((details.checks as any)["fields"]["minQty"]).to.be.equal(
                toBigNumber(0.02).toNumber()
            );
        });

        it("should revert when trying to set minimum quantity  > max trade limit quantity", async () => {
            await onChain.setMaxQtyLimit({ maxQtyLimit: 1 });
            const tx = await onChain.setMinQty({ minQty: 2 });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[17]);
        });

        it("should revert when trying to set minimum quantity  > max trade market quantity", async () => {
            await onChain.setMaxQtyMarket({ maxQtyMarket: 1 });
            const tx = await onChain.setMinQty({ minQty: 2 });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[17]);
        });

        it("should revert when trying to set minimum quantity  as 0", async () => {
            const tx = await onChain.setMinQty({ minQty: 0 });
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[18]);
        });

        it("should revert when non-admin account tries to set minimum quantity", async () => {
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(
                onChain.getAdminCap(),
                ownerAddress,
                TEST_WALLETS[0].address
            );
            await expect(
                onChain.setMinQty({ minQty: 0.02 }, alice)
            ).to.eventually.be.rejectedWith(expectedError);
        });
    });
});
