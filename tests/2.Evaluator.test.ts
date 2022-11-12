import chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { SuiObject } from "@mysten/sui.js";
import { DeploymentConfig } from "../src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getSignerSUIAddress,
    getSignerFromSeed
} from "../src/utils";
import { OnChainCalls } from "../src/OnChainCalls";
import { TEST_WALLETS } from "./helpers/accounts";
import { ERROR_CODES, OWNERSHIP_ERROR } from "../src/errors";
import { toBigNumber } from "../src/library";
import { test_deploy_market } from "./helpers/utils";
import { Transaction } from "../src/Transaction";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfig.rpcURL,
    DeploymentConfig.faucetURL
);
const ownerSigner = getSignerFromSeed(DeploymentConfig.deployer, provider);

describe("Evaluator", async () => {
    const ownerAddress = await getSignerSUIAddress(ownerSigner);
    let deployment = readFile(DeploymentConfig.filePath);
    let onChain: OnChainCalls;

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
            const details = await onChain.getOnChainObject(
                onChain.getPerpetualID()
            );
            expect((details.data as any)["fields"]["minPrice"]).to.be.equal(
                toBigNumber(0.02).toNumber()
            );
        });

        it("should revert as min price can not be set to zero", async () => {
            const tx = await onChain.setMinPrice({ minPrice: 0 });
            expect(Transaction.getError(tx), ERROR_CODES[1]);
        });

        it("should revert as min price can be > max price", async () => {
            const tx = await onChain.setMinPrice({ minPrice: 1_000_000 });
            expect(Transaction.getError(tx), ERROR_CODES[2]);
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
    });
});
