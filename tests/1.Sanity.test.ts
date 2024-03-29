import {
    DeploymentConfigs,
    readFile,
    getProvider,
    getSignerFromSeed,
    requestGas,
    OnChainCalls,
    Transaction,
    OWNERSHIP_ERROR,
    TEST_WALLETS
} from "../submodules/library-sui";
import { fundTestAccounts, expect } from "./helpers";

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
const pythObj = readFile("./pyth/priceInfoObject.json");

describe("Sanity Tests", () => {
    const deployment = readFile(DeploymentConfigs.filePath);
    let onChain: OnChainCalls;
    let ownerAddress: string;

    // deploy package once
    before(async () => {
        // await fundTestAccounts();
        ownerAddress = await ownerSigner.getAddress();
        onChain = new OnChainCalls(ownerSigner, deployment);
        //await requestGas(ownerAddress);
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
        const txResponse = await onChain.createPerpetual({
            symbol: "ETH-PERP",
            priceInfoFeedId:
                pythObj["ETH-PERP"][process.env.DEPLOY_ON as string]["feed_id"]
        });

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
            onChain.createPerpetual(
                { priceInfoFeedId: onChain.getPriceOracleObjectId() },
                alice
            )
        ).to.eventually.be.rejectedWith(expectedError);
    });
});
