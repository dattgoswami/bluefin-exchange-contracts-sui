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

export function createMoveFilename(){
    return "Move."+process.env.DEPLOY_ON as string+".toml";
}


export function syncingTomlFiles(pythObj: any){
    const menv=process.env.DEPLOY_ON as string;
    if( menv=="localnet"){
        console.log("On local net we do not have real pyth hence toml file updating already have been done")
        return;
    }else{

        const filename=createMoveFilename()
        const pythFileDir="./submodules/pyth-crosschain/target_chains/sui/contracts/";
        let data = fs.readFileSync(pythFileDir+filename, "utf8");

        let parsedData = toml.parse(data);
        //@ts-ignore
        parsedData.addresses.pyth=pythObj["package_id"];
        //@ts-ignore
        parsedData.package["published-at"]=pythObj["package_id"];
        //@ts-ignore
        parsedData.addresses.wormhole=pythObj["wormhole_id"];
        const modifiedToml = toml.stringify(parsedData);
        fs.writeFileSync(pythFileDir+"Move.toml", modifiedToml, "utf8");

        const wormholeDir="./submodules/wormhole/sui/wormhole/"
        data = fs.readFileSync(wormholeDir+filename, "utf8"); 
        parsedData=toml.parse(data);
        //@ts-ignore
        parsedData.addresses.wormhole=pythObj["wormhole_id"];
        //@ts-ignore
        parsedData.package["published-at"]=pythObj["wormhole_id"];
        //@ts-ignore
        parsedData.addresses["sui"]="0x2";

        const modifiedTomlWormhole = toml.stringify(parsedData);
        fs.writeFileSync(wormholeDir+"Move.toml", modifiedTomlWormhole, "utf8");
    }

}
