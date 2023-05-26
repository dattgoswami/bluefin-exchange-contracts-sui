import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfigs } from "../submodules/library-sui";
import {
    readFile,
    getProvider,
    getSignerFromSeed,
    createMarket,
    createOrder
} from "../submodules/library-sui";
import {
    OnChainCalls,
    OrderSigner,
    Trader,
    Transaction
} from "../submodules/library-sui";
import { expectTxToFail, expectTxToSucceed } from "./helpers/expect";
import { getTestAccounts } from "./helpers/accounts";
import { network } from "../submodules/library-sui";
import {
    ADDRESSES,
    toBigNumber,
    toBigNumberStr
} from "../submodules/library-sui";
import { ERROR_CODES, OWNERSHIP_ERROR } from "../submodules/library-sui";
import { fundTestAccounts, mintAndDeposit } from "./helpers/utils";

chai.use(chaiAsPromised);
const expect = chai.expect;
const provider = getProvider(network.rpc, network.faucet);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
const deployment = readFile(DeploymentConfigs.filePath);

describe("Funding Oracle", () => {
    let onChain: OnChainCalls;
    let ownerAddress: string;
    const [alice, bob] = getTestAccounts(provider);

    before(async () => {
        await fundTestAccounts();

        // deploy market
        deployment["markets"]["ETH-PERP"]["Objects"] = await createMarket(
            deployment,
            ownerSigner,
            provider,
            {
                startingTime: Date.now() - 1000
            }
        );
        onChain = new OnChainCalls(ownerSigner, deployment);
        ownerAddress = await ownerSigner.getAddress();
    });

    it("should successfully update max allowed FR", async () => {
        const txResult = await onChain.setMaxAllowedFundingRate({
            maxAllowedFR: 1
        });
        expectTxToSucceed(txResult);
    });

    it("should not update max allowed FR if greater than 100%", async () => {
        const txResult = await onChain.setMaxAllowedFundingRate({
            maxAllowedFR: 1.000001,
            gasBudget: 200000000
        });
        expectTxToFail(txResult);
        expect(Transaction.getErrorCode(txResult)).to.be.equal(104);
    });

    it("should revert as alice no longer has FR cap, so can not update Funding rate", async () => {
        const localDeployment = { ...deployment };
        // trade starting time, current time + 1000 seconds
        localDeployment["markets"]["ETH-PERP"]["Objects"] = await createMarket(
            deployment,
            ownerSigner,
            provider,
            {
                startingTime: Date.now() - 1000
            }
        );

        const onChain = new OnChainCalls(ownerSigner, localDeployment);

        // alice made the FR operator
        const tx1 = await onChain.setFundingRateOperator({
            operator: alice.address
        });
        expectTxToSucceed(tx1);

        const capID = Transaction.getCreatedObjectIDs(tx1)[0];

        // now Bob is FR operator
        const tx2 = await onChain.setFundingRateOperator({
            operator: bob.address
        });
        expectTxToSucceed(tx2);

        // alice tries to set funding rate
        const tx3 = await onChain.setFundingRate(
            {
                rate: toBigNumber(0.1),
                updateFRCapID: capID,
                gasBudget: 200000000
            },
            alice.signer
        );

        expectTxToFail(tx3);
        expect(Transaction.getError(tx3)).to.be.equal(ERROR_CODES[101]);
    });

    it("should revert as funding rate can not be set for 0th window", async () => {
        const localDeployment = { ...deployment };
        // trade starting time, current time + 1000 seconds
        localDeployment["markets"]["ETH-PERP"]["Objects"] = await createMarket(
            deployment,
            ownerSigner,
            provider,
            {
                startingTime: Date.now()
            }
        );

        const onChain = new OnChainCalls(ownerSigner, localDeployment);

        const txn = await onChain.setFundingRateOperator({
            operator: ownerAddress
        });
        expectTxToSucceed(txn);

        const capID = Transaction.getCreatedObjectIDs(txn)[0];

        const tx = await onChain.setFundingRate({
            rate: toBigNumber(0.1),
            updateFRCapID: capID,
            gasBudget: 200000000
        });

        expectTxToFail(tx);
        expect(Transaction.getError(tx)).to.be.equal(ERROR_CODES[901]);
    });
});
