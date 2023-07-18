import path from "path";
import { packageName, RawSigner, SuiTransactionBlockResponse } from "../submodules/library-sui"
import { Client } from "../src/Client";

export async function publishPackage(
    usingCLI = false,
    deployer: RawSigner | undefined = undefined
): Promise<SuiTransactionBlockResponse> {
    const pkgPath = `"${path.join(process.cwd(), `/${packageName}`)}"`;
    if (usingCLI) {
        return Client.publishPackage(pkgPath);
    } else {
        return Client.publishPackageUsingSDK(deployer as RawSigner, pkgPath);
    }
}