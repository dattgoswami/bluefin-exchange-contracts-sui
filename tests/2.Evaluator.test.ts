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
import { toBigNumber, toBigNumberStr } from "../src/library";
import { TEST_WALLETS } from "./helpers/accounts";
import { test_deploy_market } from "./helpers/utils";
import { expectTxToSucceed } from "./helpers/expect";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfig.network.rpc,
    DeploymentConfig.network.faucet
);

const ownerSigner = getSignerFromSeed(DeploymentConfig.deployer, provider);

describe("Evaluator", () => {
    let deployment = readFile(DeploymentConfig.filePath);
    let args = DeploymentConfig.markets[0];
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
    describe("Setters", async () => {
        describe("Price", async () => {
            it("should set min price to 0.2", async () => {
                await onChain.setMinPrice({ minPrice: 0.02 });
                const details = await onChain.getPerpDetails(
                    onChain.getPerpetualID()
                );
                expect(
                    (details.checks as any)["fields"]["minPrice"]
                ).to.be.equal(toBigNumberStr(0.02));
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
                const alice = getSignerFromSeed(
                    TEST_WALLETS[0].phrase,
                    provider
                );
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
                expect(
                    (details.checks as any)["fields"]["maxPrice"]
                ).to.be.equal(toBigNumberStr(20000));
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
                    onChain.getAdminCap(),
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
                    onChain.getAdminCap(),
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
                ).to.be.equal(toBigNumberStr(20000));
            });

            it("should revert when trying to set maximum quantity for market trade < minimum trade quantity", async () => {
                const tx = await onChain.setMaxQtyMarket({
                    maxQtyMarket: 0.001
                });
                expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[16]);
            });

            it("should revert when non-admin account tries to set maximum quantity (market)", async () => {
                const alice = getSignerFromSeed(
                    TEST_WALLETS[0].phrase,
                    provider
                );
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
                    toBigNumberStr(0.02)
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
                const alice = getSignerFromSeed(
                    TEST_WALLETS[0].phrase,
                    provider
                );
                const expectedError = OWNERSHIP_ERROR(
                    onChain.getAdminCap(),
                    ownerAddress,
                    TEST_WALLETS[0].address
                );

                await onChain.setMinQty({ minQty: 0.02 }, alice);
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
                    onChain.getAdminCap(),
                    ownerAddress,
                    TEST_WALLETS[0].address
                );
                await expect(
                    onChain.setStepSize({ stepSize: 0.1 }, alice)
                ).to.eventually.be.rejectedWith(expectedError);
            });
        });

        describe("Market Take Bounds", async () => {
            it("should set market take bound (long) to 20%", async () => {
                await onChain.setMtbLong({ mtbLong: 0.2 });
                const details = await onChain.getPerpDetails(
                    onChain.getPerpetualID()
                );
                expect(
                    (details.checks as any)["fields"]["mtbLong"]
                ).to.be.equal(toBigNumberStr(0.2));
            });

            it("should revert when trying to set market take bound (long) as 0", async () => {
                const tx = await onChain.setMtbLong({ mtbLong: 0 });
                expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[12]);
            });

            it("should revert when non-admin account tries to set market take bound (long)", async () => {
                const alice = getSignerFromSeed(
                    TEST_WALLETS[0].phrase,
                    provider
                );
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
                expect(
                    (details.checks as any)["fields"]["mtbShort"]
                ).to.be.equal(toBigNumberStr(0.2));
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
                const alice = getSignerFromSeed(
                    TEST_WALLETS[0].phrase,
                    provider
                );
                const expectedError = OWNERSHIP_ERROR(
                    onChain.getAdminCap(),
                    ownerAddress,
                    TEST_WALLETS[0].address
                );
                await expect(
                    onChain.setMtbShort({ mtbShort: 0.2 }, alice)
                ).to.eventually.be.rejectedWith(expectedError);
            });
        });

        describe("OI Open", async () => {
            it("should set max Allowed OI Open values", async () => {
                let maxLimit = [];
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
                    onChain.getAdminCap(),
                    ownerAddress,
                    TEST_WALLETS[0].address
                );
                let maxLimit = [];
                maxLimit.push(toBigNumberStr(10000));
                maxLimit.push(toBigNumberStr(20000));
                maxLimit.push(toBigNumberStr(30000));
                await expect(
                    onChain.setMaxAllowedOIOpen({ maxLimit }, alice)
                ).to.eventually.be.rejectedWith(expectedError);
            });
        });
    });

    describe("Verifying Functions Test", async () => {
        let callArgs: any = [];
        let onChainTestCall: any;
        beforeEach(async () => {
            callArgs.push(args.minPrice ? args.minPrice : toBigNumberStr(0.1));
            callArgs.push(
                args.maxPrice ? args.maxPrice : toBigNumberStr(100000)
            );
            callArgs.push(
                args.tickSize ? args.tickSize : toBigNumberStr(0.001)
            );
            callArgs.push(args.minQty ? args.minQty : toBigNumberStr(0.1));

            callArgs.push(
                args.maxQtyLimit ? args.maxQtyLimit : toBigNumberStr(100000)
            );
            callArgs.push(
                args.maxQtyMarket ? args.maxQtyMarket : toBigNumberStr(1000)
            );
            callArgs.push(args.stepSize ? args.stepSize : toBigNumberStr(0.1));
            callArgs.push(args.mtbLong ? args.mtbLong : toBigNumberStr(0.2));
            callArgs.push(args.mtbShort ? args.mtbShort : toBigNumberStr(0.2));

            callArgs.push(
                args.maxAllowedOIOpen
                    ? args.maxAllowedOIOpen
                    : [
                          toBigNumberStr(100000),
                          toBigNumberStr(100000),
                          toBigNumberStr(200000),
                          toBigNumberStr(200000),
                          toBigNumberStr(500000)
                      ]
            );
            onChainTestCall = (callArgs: any) => {
                return ownerSigner.executeMoveCallWithRequestType({
                    packageObjectId: deployment.objects.package.id,
                    module: "test",
                    function: "testTradeVerificationFunctions",
                    typeArguments: [],
                    arguments: callArgs,
                    gasBudget: 1000
                });
            };
        });
        afterEach(async () => {
            callArgs = [];
        });
        it("should pass all the verification functions", async () => {
            callArgs.push(toBigNumberStr(100)); // trade Quantity,
            callArgs.push(toBigNumberStr(10)); //trade Price
            callArgs.push(toBigNumberStr(11)); // oracle Price
            callArgs.push(true); //isBuy
            callArgs.push(toBigNumberStr(0.2));
            callArgs.push(toBigNumberStr(1000));
            const tx = await onChainTestCall(callArgs);
            expectTxToSucceed(tx);
        });
        it("should revert because trade Qty < min Qty", async () => {
            callArgs.push(toBigNumberStr(0.001)); // trade Quantity,
            callArgs.push(toBigNumberStr(10)); //trade Price
            callArgs.push(toBigNumberStr(11)); // oracle Price
            callArgs.push(true); //isBuy
            callArgs.push(toBigNumberStr(0.2));
            callArgs.push(toBigNumberStr(1000));

            const tx = await onChainTestCall(callArgs);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[19]);
        });
        it("should revert because trade price < min price", async () => {
            callArgs.push(toBigNumberStr(10)); // trade Quantity,
            callArgs.push(toBigNumberStr(0.01)); //trade Price
            callArgs.push(toBigNumberStr(11)); // oracle Price
            callArgs.push(true); //isBuy
            callArgs.push(toBigNumberStr(0.2));
            callArgs.push(toBigNumberStr(1000));

            const tx = await onChainTestCall(callArgs);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[3]);
        });
        it("should revert because mtb short check", async () => {
            callArgs.push(toBigNumberStr(10)); // trade Quantity,
            callArgs.push(toBigNumberStr(10)); //trade Price
            callArgs.push(toBigNumberStr(11)); // oracle Price
            callArgs.push(false); //isBuy
            callArgs.push(toBigNumberStr(0.2));
            callArgs.push(toBigNumberStr(1000));

            const tx = await onChainTestCall(callArgs);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[24]);
        });
        it("should revert because oi open > max Allowed OI ", async () => {
            callArgs.push(toBigNumberStr(10)); // trade Quantity,
            callArgs.push(toBigNumberStr(10)); //trade Price
            callArgs.push(toBigNumberStr(11)); // oracle Price
            callArgs.push(true); //isBuy
            callArgs.push(toBigNumberStr(0.2)); //mro
            callArgs.push(toBigNumberStr(500001)); // oi open

            const tx = await onChainTestCall(callArgs);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[25]);
        });
    });
});
