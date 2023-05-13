import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfigs } from "../src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getSignerFromSeed,
    requestGas
} from "../src/utils";
import { OnChainCalls, Transaction } from "../src/classes";
import { TEST_WALLETS } from "./helpers/accounts";
import { OWNERSHIP_ERROR } from "../src/errors";
import { fundTestAccounts } from "./helpers/utils";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

describe("Sanity Tests", () => {
    const deployment = readFile(DeploymentConfigs.filePath);
    let onChain: OnChainCalls;
    let ownerAddress: string;

    // deploy package once
    before(async () => {
        await fundTestAccounts();
        ownerAddress = await ownerSigner.getAddress();
        onChain = new OnChainCalls(ownerSigner, deployment);
        await requestGas(ownerAddress);
    });

    it("deployer should have non zero balance", async () => {
        const coins = await provider.getCoins({ owner: ownerAddress });
        expect(coins.data.length).to.be.greaterThan(0);
    });

    it("The deployer account must be the owner of ExchangeAdminCap", async () => {
        const details = await onChain.getOnChainObject(
            onChain.getExchangeAdminCap()
        );
        expect((details?.data?.owner as any).AddressOwner).to.be.equal(
            ownerAddress
        );
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
            onChain.getExchangeAdminCap(),
            ownerAddress,
            TEST_WALLETS[0].address
        );

        await expect(
            onChain.createPerpetual({}, alice)
        ).to.eventually.be.rejectedWith(expectedError);
    });
});
