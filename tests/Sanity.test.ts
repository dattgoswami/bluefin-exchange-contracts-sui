import { SuiObject } from "@mysten/sui.js";
import { expect } from "chai";
import { DeploymentConfig } from "../config/DeploymentConfig";
import { readFile, getProvider, getSigner, getSignerSUIAddress } from "../src/utils";

describe("Sanity Tests", async() => {
    const provider = getProvider(DeploymentConfig.rpcURL);
    const ownerSigner = getSigner(DeploymentConfig.deployer, provider);
    const deployment = readFile(DeploymentConfig.filePath);
    const ownerAddress = await getSignerSUIAddress(ownerSigner);

    it("The deployer account must be the owner of AdminCap", async()=> {
        const adminCapID = deployment["AdminCap"].id;
        const details = (await provider.getObject(adminCapID)).details as SuiObject;
        expect((details.owner as any).AddressOwner).to.be.equal(ownerAddress);
    });

});