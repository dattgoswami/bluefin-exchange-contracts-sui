import chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { DeploymentConfig } from "../src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getSignerSUIAddress,
    getSignerFromSeed,
    getKeyPairFromSeed,
    requestGas
} from "../src/utils";
import { OnChainCalls, OrderSigner } from "../src/classes";
import { getCreatedObjects } from "../src/utils";
import { TEST_WALLETS } from "./helpers/accounts";
import { OWNERSHIP_ERROR } from "../src/errors";
import { test_deploy_market } from "./helpers/utils";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfig.rpcURL,
    DeploymentConfig.faucetURL
);
const ownerSigner = getSignerFromSeed(DeploymentConfig.deployer, provider);

describe("Sanity Tests", () => {
    let deployment = readFile(DeploymentConfig.filePath);
    let onChain: OnChainCalls;
    let ownerAddress: string;

    // deploy package once
    before(async () => {
        ownerAddress = await getSignerSUIAddress(ownerSigner);
        // await requestGas(ownerAddress);
        // await requestGas(TEST_WALLETS[0].address);
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

    it("should allow admin to create ETH perpetual", async () => {
        const moveCallTxn = await onChain.createPerpetual({});
        const objects = await getCreatedObjects(provider, moveCallTxn);

        const details = await onChain.getOnChainObject(
            onChain.getPerpetualID()
        );

        expect((details.data as any)["fields"]["name"]).to.be.equal("ETH-PERP");
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
