import path from "path";
import {
    RawSigner,
    SuiTransactionBlockResponse,
    DeploymentData,
    OBJECT_OWNERSHIP_STATUS,
    OnChainCalls
} from "../submodules/library-sui";
import { Client } from "../src/Client";
import fs from "fs";
import * as toml from "@iarna/toml";
import { getBankTable } from "./deployment";
export interface KeyValue {
    [key: string]: any;
}

export async function publishPackage(
    usingCLI = false,
    deployer: RawSigner | undefined = undefined,
    packageName: string
): Promise<SuiTransactionBlockResponse> {
    const pkgPath = `"${path.join(process.cwd(), `/${packageName}`)}"`;
    if (usingCLI) {
        return Client.publishPackage(pkgPath);
    } else {
        return Client.publishPackageUsingSDK(deployer as RawSigner, pkgPath);
    }
}

export async function postDeployment(
    signer: RawSigner,
    deploymentData: DeploymentData,
    addressUSDC: string
): Promise<DeploymentData> {
    const onChain = new OnChainCalls(signer, deploymentData);

    // create bank object
    const res = await onChain.createBank(addressUSDC);
    deploymentData["objects"]["Bank"] = {
        id: (res as any).objectChanges[2].objectId,
        owner: OBJECT_OWNERSHIP_STATUS.SHARED,
        dataType: (res as any).objectChanges[2].objectType
    };

    deploymentData["objects"]["BankTable"] = await getBankTable(
        signer.provider,
        deploymentData
    );

    return deploymentData;
}

export function editTomlFile(
    filePath: string,
    address: string,
    updatePublishAt = false,
    isMainContract = false
) {
    console.log("Editing Pyth Move.toml file");
    const data = fs.readFileSync(filePath, "utf8");

    const parsedData = toml.parse(data) as any;
    if (isMainContract) {
        parsedData.addresses.Pyth = address;
    } else {
        parsedData.addresses.pyth = address;
    }
    if (updatePublishAt) {
        parsedData.package["published-at"] = address;
    }
    const modifiedToml = toml.stringify(parsedData);
    fs.writeFileSync(filePath, modifiedToml, "utf8");
}

export function createMoveFilename() {
    return (("Move." + process.env.DEPLOY_ON) as string) + ".toml";
}

export function syncingTomlFiles(pythObj: any) {
    const menv = process.env.DEPLOY_ON as string;
    if (menv == "localnet") {
        console.log(
            "On local net we do not have real pyth hence toml file updating already have been done"
        );
        return;
    } else {
        const filename = createMoveFilename();
        const pythFileDir =
            "./submodules/pyth-crosschain/target_chains/sui/contracts/";
        let data = fs.readFileSync(pythFileDir + filename, "utf8");

        let parsedData = toml.parse(data) as any;
        parsedData.addresses.pyth = pythObj["package_id"];
        parsedData.package["published-at"] = pythObj["package_id"];
        parsedData.addresses.wormhole = pythObj["wormhole_id"];
        const modifiedToml = toml.stringify(parsedData);
        fs.writeFileSync(pythFileDir + "Move.toml", modifiedToml, "utf8");

        const wormholeDir = "./submodules/wormhole/sui/wormhole/";
        data = fs.readFileSync(wormholeDir + filename, "utf8");
        parsedData = toml.parse(data);
        parsedData.addresses.wormhole = pythObj["wormhole_id"];
        parsedData.package["published-at"] = pythObj["wormhole_id"];
        parsedData.addresses["sui"] = "0x2";

        const modifiedTomlWormhole = toml.stringify(parsedData);
        fs.writeFileSync(
            wormholeDir + "Move.toml",
            modifiedTomlWormhole,
            "utf8"
        );
    }
}

export async function checkPythPriceInfoObjects(
    signer: RawSigner,
    deployment: DeploymentData
): Promise<boolean> {
    const onChain = new OnChainCalls(signer, deployment);
    for (const market in deployment.markets) {
        const perpObj = (await onChain.getOnChainObject(
            deployment["markets"][market]["Objects"]["Perpetual"]["id"]
        )) as any;
        const priceObj = (await onChain.getOnChainObject(
            deployment["markets"][market]["Objects"]["PriceOracle"]["id"]
        )) as any;

        const priceFeedPerp =
            perpObj["data"]["content"]["fields"]["priceIdentifierId"];
        const priceFeedPyth =
            priceObj["data"]["content"]["fields"]["price_info"]["fields"][
                "price_feed"
            ]["fields"]["price_identifier"]["fields"]["bytes"];
        if (
            Buffer.from(priceFeedPerp).toString("hex") !=
            Buffer.from(priceFeedPyth).toString("hex")
        ) {
            return false;
        }
    }
    return true;
}
