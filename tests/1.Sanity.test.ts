import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfig } from "../src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getSignerSUIAddress,
    getSignerFromSeed
} from "../src/utils";
import { OnChainCalls, Transaction } from "../src/classes";
import { TEST_WALLETS } from "./helpers/accounts";
import { OWNERSHIP_ERROR } from "../src/errors";
import { fundTestAccounts } from "./helpers/utils";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfig.network.rpc,
    DeploymentConfig.network.faucet
);
const ownerSigner = getSignerFromSeed(DeploymentConfig.deployer, provider);

describe("Sanity Tests", () => {
    let deployment = readFile(DeploymentConfig.filePath);
    let onChain: OnChainCalls;
    let ownerAddress: string;

    // deploy package once
    before(async () => {
        await fundTestAccounts();
        ownerAddress = await getSignerSUIAddress(ownerSigner);
        onChain = new OnChainCalls(ownerSigner, deployment);
    });

    it("deployer should have non zero balance", async () => {
        const coins = await provider.getCoinBalancesOwnedByAddress(
            ownerAddress
        );
        expect(coins.length).to.be.greaterThan(0);
    });

    it("The deployer account must be the owner of AdminCap", async () => {
        const details = await onChain.getOnChainObject(onChain.getAdminCap());
        expect((details.owner as any).AddressOwner).to.be.equal(ownerAddress);
    });

    it("should allow admin to create a perpetual", async () => {
        const txResponse = await onChain.createPerpetual({ name: "TEST-PERP" });
        const event = Transaction.getEvents(
            txResponse,
            "PerpetualCreationEvent"
        )[0];
        expect(event).to.not.be.undefined;
    });

    it("should revert when non-admin account tries to create a perpetual", async () => {
        const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
        const expectedError = OWNERSHIP_ERROR(
            onChain.getAdminCap(),
            ownerAddress,
            TEST_WALLETS[0].address
        );

        await expect(
            onChain.createPerpetual({}, alice)
        ).to.eventually.be.rejectedWith(expectedError);
    });
});
