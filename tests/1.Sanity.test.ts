import chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { SuiObject } from "@mysten/sui.js";
import { DeploymentConfig } from "../src/DeploymentConfig";
import { readFile, getProvider, getSignerSUIAddress, getSignerFromSeed, getKeyPairFromSeed, requestGas } from "../src/utils";
import { OnChainCalls } from "../src/OnChainCalls";
import { getCreatedObjects } from "../src/utils";
import { TEST_WALLETS } from "./helpers/accounts";
import { OWNERSHIP_ERROR } from "../src/errors";
import { test_deploy_market } from "./helpers/utils";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(DeploymentConfig.rpcURL, DeploymentConfig.faucetURL);
const ownerSigner = getSignerFromSeed(DeploymentConfig.deployer, provider);


describe("Sanity Tests", async() => {
    
    const ownerAddress = await getSignerSUIAddress(ownerSigner);
    let deployment = readFile(DeploymentConfig.filePath);
    let onChain:OnChainCalls;

    // deploy package once
before(async () => {
        // await requestGas(ownerAddress);        
        // await requestGas(TEST_WALLETS[0].address);
    });

    // deploy the market again before each test
    beforeEach(async ()=>{
        deployment['markets'].push(await test_deploy_market(deployment, ownerSigner, provider));
        onChain = new OnChainCalls(ownerSigner, deployment);
    });

    it("deployer should have non zero balance", async ()=>{
        const coins = await provider.getCoinBalancesOwnedByAddress(
            ownerAddress
        );
        expect(coins.length).to.be.greaterThan(0);
    });

    it("The deployer account must be the owner of AdminCap", async () => {
        const details = (await provider.getObject(onChain._getAdminCap()))
            .details as SuiObject;
        expect((details.owner as any).AddressOwner).to.be.equal(ownerAddress);
    });

    it("should allow admin to create ETH perpetual", async () => {
        const moveCallTxn = await onChain.createPerpetual({});
        const objects = await getCreatedObjects(provider, moveCallTxn);
        const details = (await provider.getObject(objects["Perpetual"].id))
            .details as SuiObject;
        expect((details.data as any)["fields"]["name"]).to.be.equal("ETH-PERP");
    });

    it("should revert when non-admin account tries to create a perpetual", async () => {
        const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
        const expectedError = OWNERSHIP_ERROR(onChain._getAdminCap(), ownerAddress, TEST_WALLETS[0].address);           
        await expect(onChain.createPerpetual({}, alice)).to.eventually.be.rejectedWith(expectedError);
    });


});
