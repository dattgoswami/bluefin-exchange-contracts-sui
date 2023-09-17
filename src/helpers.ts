import path from "path";
import {
    RawSigner,
    SuiTransactionBlockResponse,
    readFile,
    DeploymentData,
    TransactionBlock,
    OBJECT_OWNERSHIP_STATUS,
    OnChainCalls
} from "../submodules/library-sui";
import { Client } from "../src/Client";
import fs from "fs";
import * as toml from "@iarna/toml";
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
) {
    //perform post deployment steps.
    const onChain = new OnChainCalls(signer, deploymentData);
    const tx = new TransactionBlock();
    const packageId = deploymentData.objects.package.id;
    tx.moveCall({
        target: `${packageId}::margin_bank::create_bank`,
        arguments: [
            tx.object(deploymentData["objects"]["ExchangeAdminCap"]["id"]),
            tx.pure(addressUSDC)
        ],
        typeArguments: [`${addressUSDC}::coin::COIN`]
    });
    const res = await signer.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
            showObjectChanges: true,
            showEffects: true,
            showEvents: true,
            showInput: true
        }
    });

    return {
        id: (res as any).objectChanges[2].objectId,
        owner: OBJECT_OWNERSHIP_STATUS.SHARED,
        dataType: (res as any).objectChanges[2].objectType
    };
}

export function editTomlFile(
    filePath: string,
    address: string,
    updatePublishAt = false,
    isMainContract = false
) {
    console.log("Editing Pyth Move.toml file");
    const newPythValue = "0x0";
    const data = fs.readFileSync(filePath, "utf8");

    const parsedData = toml.parse(data);
    if (isMainContract) {
        //@ts-ignore
        parsedData.addresses.Pyth = address;
    } else {
        //@ts-ignore
        parsedData.addresses.pyth = address;
    }
    if (updatePublishAt) {
        //@ts-ignore
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

        let parsedData = toml.parse(data);
        //@ts-ignore
        parsedData.addresses.pyth = pythObj["package_id"];
        //@ts-ignore
        parsedData.package["published-at"] = pythObj["package_id"];
        //@ts-ignore
        parsedData.addresses.wormhole = pythObj["wormhole_id"];
        const modifiedToml = toml.stringify(parsedData);
        fs.writeFileSync(pythFileDir + "Move.toml", modifiedToml, "utf8");

        const wormholeDir = "./submodules/wormhole/sui/wormhole/";
        data = fs.readFileSync(wormholeDir + filename, "utf8");
        parsedData = toml.parse(data);
        //@ts-ignore
        parsedData.addresses.wormhole = pythObj["wormhole_id"];
        //@ts-ignore
        parsedData.package["published-at"] = pythObj["wormhole_id"];
        //@ts-ignore
        parsedData.addresses["sui"] = "0x2";

        const modifiedTomlWormhole = toml.stringify(parsedData);
        fs.writeFileSync(
            wormholeDir + "Move.toml",
            modifiedTomlWormhole,
            "utf8"
        );
    }
}
