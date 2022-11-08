import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import nacl from 'tweetnacl';

import { SuiObject, Base64DataBuffer } from "@mysten/sui.js";
import { DeploymentConfig } from "../src/DeploymentConfig";
import { readFile, getProvider, getSignerFromKeyPair, getKeyPairFromSeed, getSignerSUIAddress, getSignerFromSeed} from "../src/utils";
import { OnChainCalls } from "../src/OnChainCalls";
import { getCreatedObjects } from "../src/objects";
import { TEST_WALLETS } from "./helpers/accounts";
import { ERROR_CODES, OWNERSHIP_ERROR } from "../src/errors";
import { toBigNumber } from "../src/library";

chai.use(chaiAsPromised);
const expect = chai.expect;


describe("Sanity Tests", async() => {
    const ownerKeyPair = getKeyPairFromSeed(DeploymentConfig.deployer);
    const provider = getProvider(DeploymentConfig.rpcURL, DeploymentConfig.faucetURL);
    const ownerSigner = getSignerFromKeyPair(ownerKeyPair, provider);
    // TODO create a type for deployment
    const deployment = readFile(DeploymentConfig.filePath);
    const ownerAddress = await getSignerSUIAddress(ownerSigner);
    const onChain = new OnChainCalls(ownerSigner, deployment);

    before(async () => {
        // await provider.requestSuiFromFaucet(ownerAddress);
    });

    it("deployer should have non zero balance", async ()=>{

        const coins = await provider.getCoinBalancesOwnedByAddress(
            ownerAddress
        );
        expect(coins.length).to.be.greaterThan(0);

    });

    it("The deployer account must be the owner of AdminCap", async()=> {
        const details = (await provider.getObject(onChain._getAdminCap())).details as SuiObject;
        expect((details.owner as any).AddressOwner).to.be.equal(ownerAddress);
    });

    it("should allow admin to create ETH perpetual", async()=>{
        const moveCallTxn = await onChain.createPerpetual({});
        const objects = await getCreatedObjects(provider, moveCallTxn)
        const details = (await provider.getObject(objects["Perpetual"].id)).details as SuiObject;
        expect((details.data as any)["fields"]["name"]).to.be.equal("ETH-PERP");
    });

    it("should revert when non-admin account tries to create a perpetual", async()=>{
        const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
        const expectedError = OWNERSHIP_ERROR(deployment["objects"]["AdminCap"].id, ownerAddress, TEST_WALLETS[0].address);
        await expect(onChain.createPerpetual({}, alice)).to.eventually.be.rejectedWith(expectedError);
    });

    describe("Price", async() => {

        it("should set min price to 0.2", async()=>{
            await onChain.setMinPrice({minPrice:0.02})
            const details = (await provider.getObject(onChain._getPerpetual())).details as SuiObject;
            expect((details.data as any)["fields"]["minPrice"]).to.be.equal(toBigNumber(0.02).toNumber());
        });

        it("should revert as min price can not be set to zero", async() =>{
            const tx = await onChain.setMinPrice({minPrice:0})
            expect(onChain._getError(tx), ERROR_CODES[1])
        });

        it("should revert as min price can be > max price", async() => {
            const tx = await onChain.setMinPrice({minPrice:1_000_000})
            expect(onChain._getError(tx), ERROR_CODES[2])
        });


        it("should revert when non-admin account tries to set min price", async()=>{
            const alice = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
            const expectedError = OWNERSHIP_ERROR(onChain._getAdminCap(), ownerAddress, TEST_WALLETS[0].address);
            await expect(onChain.setMinPrice({minPrice:0.5}, alice)).to.eventually.be.rejectedWith(expectedError);
        });
    
    });

    xit("should correctly sign data", async ()=>{

    const signData = new Base64DataBuffer(
        new TextEncoder().encode('hello world')
        );

    const signature = ownerKeyPair.signData(signData);

    const isValid = nacl.sign.detached.verify(
        signData.getData(),
        signature.getData(),
        ownerKeyPair.getPublicKey().toBytes()
      );
    expect(isValid).to.be.true;
    });


});