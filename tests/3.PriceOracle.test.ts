import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfigs } from "../src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getSignerFromSeed,
    createMarket,
    requestGas
} from "../src/utils";
import { OnChainCalls, Transaction } from "../src/classes";
import { getTestAccounts } from "./helpers/accounts";
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
const testWallet = getTestAccounts(provider)[0];

describe("Price Oracle", () => {
    const deployment = readFile(DeploymentConfigs.filePath);
    let onChain: OnChainCalls;
    let ownerAddress: string;
    let cap: string;

    before(async () => {
        ownerAddress = await ownerSigner.getAddress();
        onChain = new OnChainCalls(ownerSigner, deployment);

        await fundTestAccounts();
        await requestGas(ownerAddress);
    });

    beforeEach(async () => {
        deployment["markets"]["ETH-PERP"]["Objects"] = (
            await createMarket(deployment, ownerSigner, provider)
        ).marketObjects;

        onChain = new OnChainCalls(ownerSigner, deployment);

        // make owner the price oracle operator
        const tx = await onChain.setPriceOracleOperator({
            operator: ownerAddress
        });

        cap = Transaction.getCreatedObjectIDs(tx)[0];
    });

    describe("Setting oracle price", () => {
        it("should allow admin to setOraclePrice", async () => {
            const newPrice = toBigNumber(12);

            const tx = await onChain.updateOraclePrice({
                price: newPrice.toFixed(),
                updateOPCapID: cap
            });

            expectTxToSucceed(tx);

            expectTxToEmitEvent(tx, "OraclePriceUpdateEvent");

            const details = await onChain.getOnChainObject(
                onChain.getPerpetualID()
            );

            expect(
                bigNumber(
                    (details?.data?.content as any).fields.priceOracle?.fields
                        ?.price
                ).toFixed()
            ).to.equal(newPrice.toFixed());

            const event = Transaction.getEvents(
                tx,
                "OraclePriceUpdateEvent"
            )[0];

            expect(bigNumber(event?.price).toFixed(0)).to.be.equal(
                newPrice.toFixed()
            );
        });

        it("should only allow price oracle capability owner to update oracle price", async () => {
            const error = OWNERSHIP_ERROR(
                onChain.getPriceOracleOperatorCap(),
                ownerAddress,
                testWallet.address
            );

            await expect(
                onChain.updateOraclePrice(
                    {
                        price: toBigNumber(12).toFixed()
                    },
                    testWallet.signer
                )
            ).to.be.eventually.rejectedWith(error);
        });

        it("should allow new price oracle operator to update price once it has become the operator", async () => {
            const tx1 = await onChain.setPriceOracleOperator({
                operator: testWallet.address
            });

            const capID = Transaction.getCreatedObjectIDs(tx1)[0];

            const tx2 = await onChain.updateOraclePrice(
                {
                    price: toBigNumber(12).toFixed(),
                    updateOPCapID: capID
                },
                testWallet.signer
            );

            expectTxToSucceed(tx2);
        });

        it("should revert when an old price oracle operator tries to update oracle price", async () => {
            const tx1 = await onChain.setPriceOracleOperator({
                operator: testWallet.address
            });
            expectTxToSucceed(tx1);

            const tx2 = await onChain.updateOraclePrice({
                price: toBigNumber(12).toFixed(),
                updateOPCapID: onChain.getPriceOracleOperatorCap(), // this is old cap still owned by admin
                gasBudget: 10000000
            });

            expect(Transaction.getError(tx2)).to.be.equal(ERROR_CODES[100]);
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
                    price: oldPrice.toFixed(),
                    updateOPCapID: cap
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
                    price: newPrice.toFixed(),
                    updateOPCapID: cap
                },
                ownerSigner
            );

            expectTxToSucceed(tx3);
            expectTxToEmitEvent(tx3, "OraclePriceUpdateEvent");

            const event = Transaction.getEvents(
                tx3,
                "OraclePriceUpdateEvent"
            )[0];
            expect(bigNumber(event?.price).toFixed(0)).to.be.equal(
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
                    price: oldPrice.toFixed(),
                    updateOPCapID: cap
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
                    price: newPrice.toFixed(),
                    updateOPCapID: cap,
                    gasBudget: 1000000
                },
                ownerSigner
            );

            expectTxToFail(tx3);
            expect(Transaction.getError(tx3)).to.be.equal(ERROR_CODES[102]);
        });
    });

    describe("Setting max price update difference", () => {
        it("should fail to set maxAllowedPriceDifference to 0 percent ", async () => {
            const tx = await onChain.updatePriceOracleMaxAllowedPriceDifference(
                {
                    maxAllowedPriceDifference: toBigNumber(0).toFixed(0),
                    gasBudget: 1000000
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
                bigNumber(event?.maxAllowedPriceDifference).toFixed(0)
            ).to.be.equal(newAllowedPriceDiff.toFixed());
        });

        it("should not update price oracle maxAllowedPriceDifference when non-admin is the sender", async () => {
            const expectedError = OWNERSHIP_ERROR(
                onChain.getExchangeAdminCap(),
                ownerAddress,
                await testWallet.signer.getAddress()
            );

            await expect(
                onChain.updatePriceOracleMaxAllowedPriceDifference(
                    {
                        maxAllowedPriceDifference:
                            toBigNumber(100000).toFixed(0),
                        gasBudget: 1000000
                    },
                    testWallet.signer
                )
            ).to.be.eventually.rejectedWith(expectedError);
        });
    });
});
