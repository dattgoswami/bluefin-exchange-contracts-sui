import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfig } from "../src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getSignerSUIAddress,
    getSignerFromSeed
} from "../src/utils";
import { OnChainCalls } from "../src/OnChainCalls";
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

describe("Operators", async () => {
    const ownerAddress = await getSignerSUIAddress(ownerSigner);
    let deployment = readFile(DeploymentConfig.filePath);
    let onChain: OnChainCalls;

    beforeEach(async () => {
        deployment["markets"] = [
            await test_deploy_market(deployment, ownerSigner, provider)
        ];
        onChain = new OnChainCalls(ownerSigner, deployment);
    });

    it.only("should set owner as settlement operator", async () => {
        const txResponse = await onChain.updateOperator({
            operator: ownerAddress,
            status: true
        });
        expectTxToSucceed(txResponse);
    });
});
