import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfig } from "../src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getSignerSUIAddress,
    getSignerFromSeed
} from "../src/utils";
import { OnChainCalls } from "../src/classes";
import { TEST_WALLETS } from "./helpers/accounts";
import { test_deploy_market } from "./helpers/utils";
import { expectTxToSucceed, expectTxToFail } from "./helpers/expect";
import { Transaction } from "../src/Transaction";
import { toBigNumberStr } from "../src/library";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfig.rpcURL,
    DeploymentConfig.faucetURL
);
const ownerSigner = getSignerFromSeed(DeploymentConfig.deployer, provider);

describe("Positions", () => {
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

    it("should create a position for owner", async () => {
        const txResponse = await onChain.createPosition({});
        expectTxToSucceed(txResponse);
    });

    it("should create a position for alice", async () => {
        const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
        const txResponse = await onChain.createPosition({}, alice);
        expectTxToSucceed(txResponse);
    });

    it("should allow alice to mutate owner's position", async () => {
        const tx = await onChain.createPosition({});
        const userPositions = Transaction.getCreatedObjects(
            tx as any,
            "UserPosition"
        );

        const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);

        const txResponse = await onChain.updatePosition(
            { address: ownerAddress },
            alice
        );

        expectTxToSucceed(txResponse);

        const userDetails = await onChain.getUserDetails(userPositions[0].id);
        expect(userDetails.qPos).to.be.equal(toBigNumberStr(1));
    });

    it("should fail to create position for owner as it already has a position object", async () => {
        // should create object
        await onChain.createPosition({});

        // should fail
        const txResponse = await onChain.createPosition({});
        expectTxToFail(txResponse);
    });

    it("should update owner position to have qPos 10", async () => {
        await onChain.createPosition({});
        await onChain.updatePosition({ qPos: 10 });
        const txResponse = await onChain.updatePosition({});
        expectTxToSucceed(txResponse);
    });
});
