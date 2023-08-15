import path from "path";
import {
    RawSigner,
    SuiTransactionBlockResponse,
    readFile
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

export function readPythObjectFiles(): any {
    if (process.env.DEPLOY_ON == "testnet") {
        const data = readFile("./pythfiles/priceInfoObjectTestnet.json");
        return data;
    } else if (process.env.DEPLOY_ON == "mainnet") {
        const data = readFile("./pythfiles/priceInfoObjectMainnet.json");
        return data;
    } else if (process.env.DEPLOY_ON == "local") {
        const data = readFile("./pythfiles/priceInfoObjectLocalnet.json");
        return data;
    }
}

//based on name of env like testnet or localnet get me the filepath
export function getFilePathFromEnv(): string {
    if (process.env.DEPLOY_ON == "testnet") {
        return "./pythfiles/priceInfoObjectTestnet.json";
    } else if (process.env.DEPLOY_ON == "mainnet") {
        return "./pythfiles/priceInfoObjectMainnet.json";
    } else {
        return "./pythfiles/priceInfoObjectLocalnet.json";
    }
}
