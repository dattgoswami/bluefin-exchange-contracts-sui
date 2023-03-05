import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfigs } from "../src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getSignerFromSeed,
    getAddressFromSigner,
    createMarket
} from "../src/utils";
import { OnChainCalls, Transaction } from "../src/classes";
import { TEST_WALLETS } from "./helpers/accounts";
import { ERROR_CODES, OWNERSHIP_ERROR } from "../src/errors";
import { bigNumber, toBigNumber } from "../src/library";
import {
    expectTxToEmitEvent,
    expectTxToFail,
    expectTxToSucceed
} from "./helpers/expect";
import { fundTestAccounts } from "./helpers/utils";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.rpc
);

const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
const testSigner = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);

describe("Price Oracle", () => {
    const deployment = readFile(DeploymentConfigs.filePath);
    let onChain: OnChainCalls;
    let ownerAddress: string;

    before(async () => {
        await fundTestAccounts();
        ownerAddress = await getAddressFromSigner(ownerSigner);
        onChain = new OnChainCalls(ownerSigner, deployment);
    });

    beforeEach(async () => {
        deployment["markets"] = {
            "ETH-PERP": {
                Objects: (await createMarket(deployment, ownerSigner, provider))
                    .marketObjects
            }
        };
        onChain = new OnChainCalls(ownerSigner, deployment);
    });

    describe("Setting oracle price", () => {
        it("should allow admin to setOraclePrice", async () => {
            const newPrice = toBigNumber(12);

            const tx = await onChain.updateOraclePrice({
                price: newPrice.toFixed()
            });

            expectTxToSucceed(tx);

            expectTxToEmitEvent(tx, "OraclePriceUpdateEvent");

            const details = await onChain.getOnChainObject(
                onChain.getPerpetualID()
            );

            expect(
                bigNumber(
                    (details.data as any)?.fields?.priceOracle?.fields?.price
                ).toFixed()
            ).to.equal(newPrice.toFixed());

            const event = Transaction.getEvents(
                tx,
                "OraclePriceUpdateEvent"
            )[0];

            expect(bigNumber(event?.fields?.price).toFixed(0)).to.be.equal(
                newPrice.toFixed()
            );
        });

        it("should not allow non-capable sender to setOraclePrice", async () => {
            const tx = await onChain.updateOraclePrice(
                {
                    price: toBigNumber(12).toFixed()
                },
                testSigner
            );

            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[100]);
        });

        it("should allow oracle price update when price difference is within max allowed bound", async () => {
            const newAllowedPriceDiff = toBigNumber(0.3);
            const oldPrice = toBigNumber(3);
            const newPrice = toBigNumber(3.9);

            // updating allowed diff to max value to allow setting up test
            const tx0 =
                await onChain.updatePriceOracleMaxAllowedPriceDifference(
                    {
                        maxAllowedPriceDifference: toBigNumber(10000).toFixed(0)
                    },
                    ownerSigner
                );
            expectTxToSucceed(tx0);

            const tx1 = await onChain.updateOraclePrice(
                {
                    price: oldPrice.toFixed()
                },
                ownerSigner
            );

            expectTxToSucceed(tx1);

            const tx2 =
                await onChain.updatePriceOracleMaxAllowedPriceDifference(
                    {
                        maxAllowedPriceDifference:
                            newAllowedPriceDiff.toFixed(0)
                    },
                    ownerSigner
                );
            expectTxToSucceed(tx2);

            const tx3 = await onChain.updateOraclePrice(
                {
                    price: newPrice.toFixed()
                },
                ownerSigner
            );

            expectTxToSucceed(tx3);
            expectTxToEmitEvent(tx3, "OraclePriceUpdateEvent");

            const event = Transaction.getEvents(
                tx3,
                "OraclePriceUpdateEvent"
            )[0];
            expect(bigNumber(event?.fields?.price).toFixed(0)).to.be.equal(
                newPrice.toFixed()
            );
        });

        it("should revert when new price percentage difference against old price is more than allowed percentage", async () => {
            const newAllowedPriceDiff = toBigNumber(0.3);
            const oldPrice = toBigNumber(3);
            const newPrice = toBigNumber(3.91);

            // updating allowed diff to max value to allow setting up test
            const tx0 =
                await onChain.updatePriceOracleMaxAllowedPriceDifference(
                    {
                        maxAllowedPriceDifference: toBigNumber(10000).toFixed(0)
                    },
                    ownerSigner
                );
            expectTxToSucceed(tx0);

            const tx1 = await onChain.updateOraclePrice(
                {
                    price: oldPrice.toFixed()
                },
                ownerSigner
            );

            expectTxToSucceed(tx1);

            const tx2 =
                await onChain.updatePriceOracleMaxAllowedPriceDifference(
                    {
                        maxAllowedPriceDifference:
                            newAllowedPriceDiff.toFixed(0)
                    },
                    ownerSigner
                );
            expectTxToSucceed(tx2);

            const tx3 = await onChain.updateOraclePrice(
                {
                    price: newPrice.toFixed()
                },
                ownerSigner
            );

            expectTxToFail(tx3);
            expect(Transaction.getError(tx3)).to.be.equal(ERROR_CODES[102]);
        });
    });

    describe("Updating Operator", () => {
        it("should update price oracle operator", async () => {
            const tx = await onChain.updatePriceOracleOperator(
                {
                    operator: await getAddressFromSigner(testSigner)
                },
                ownerSigner
            );

            expectTxToSucceed(tx);
            expectTxToEmitEvent(tx, "PriceOracleOperatorUpdateEvent");

            const newPrice = toBigNumber(3);

            const txb = await onChain.updateOraclePrice(
                {
                    price: newPrice.toFixed()
                },
                testSigner
            );

            expectTxToSucceed(txb);
            expectTxToEmitEvent(txb, "OraclePriceUpdateEvent");
            const event = Transaction.getEvents(
                txb,
                "OraclePriceUpdateEvent"
            )[0];
            expect(bigNumber(event?.fields?.price).toFixed(0)).to.be.equal(
                newPrice.toFixed()
            );
        });

        it("should revert when trying to update oracle operator to existing one", async () => {
            const tx = await onChain.updatePriceOracleOperator(
                {
                    operator: ownerAddress
                },
                ownerSigner
            );

            expectTxToFail(tx);
            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[101]);
        });

        it("should not update price oracle operator when non-admin is the sender", async () => {
            const expectedError = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                ownerAddress,
                await getAddressFromSigner(testSigner)
            );

            await expect(
                onChain.updatePriceOracleOperator(
                    {
                        operator: await getAddressFromSigner(testSigner)
                    },
                    testSigner
                )
            ).to.eventually.rejectedWith(expectedError);
        });
    });

    describe("Setting max price update difference", () => {
        it("should fail to set maxAllowedPriceDifference to 0 percent ", async () => {
            const tx = await onChain.updatePriceOracleMaxAllowedPriceDifference(
                {
                    maxAllowedPriceDifference: toBigNumber(0).toFixed(0)
                },
                ownerSigner
            );

            expectTxToFail(tx);

            expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[103]);
        });

        it("should update price oracle maxAllowedPriceDifference", async () => {
            const newAllowedPriceDiff = toBigNumber(100000);

            const tx = await onChain.updatePriceOracleMaxAllowedPriceDifference(
                {
                    maxAllowedPriceDifference: newAllowedPriceDiff.toFixed(0)
                },
                ownerSigner
            );

            expectTxToSucceed(tx);
            expectTxToEmitEvent(tx, "MaxAllowedPriceDiffUpdateEvent");
            const event = Transaction.getEvents(
                tx,
                "MaxAllowedPriceDiffUpdateEvent"
            )[0];
            expect(
                bigNumber(event?.fields?.maxAllowedPriceDifference).toFixed(0)
            ).to.be.equal(newAllowedPriceDiff.toFixed());
        });

        it("should not update price oracle maxAllowedPriceDifference when non-admin is the sender", async () => {
            const expectedError = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                ownerAddress,
                await getAddressFromSigner(testSigner)
            );

            await expect(
                onChain.updatePriceOracleMaxAllowedPriceDifference(
                    {
                        maxAllowedPriceDifference:
                            toBigNumber(100000).toFixed(0)
                    },
                    testSigner
                )
            ).to.be.eventually.rejectedWith(expectedError);
        });
    });
});
