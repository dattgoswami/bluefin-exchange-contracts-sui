import {
    DeploymentConfigs,
    TransactionBlock,
    writeFile
} from "../submodules/library-sui/dist";
import path from "path";
import {
    readFile,
    getProvider,
    getSignerFromSeed
} from "../submodules/library-sui/dist";
import { OnChainCalls } from "../submodules/library-sui/dist";
import { packageName } from "../submodules/library-sui/dist";
import { UpgradePolicy, toB64 } from "@mysten/sui.js";
import { Transaction } from "../submodules/library-sui/dist";
import { Client } from "../src/Client";

const deployment = readFile(DeploymentConfigs.filePath);

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

const onChain = new OnChainCalls(ownerSigner, deployment);

async function main() {
    const ms_wallet =
        "0x9ab96bd71b3ce1248ae09b4129397fef581ea20812ed1353c73f1fa9463310ba";

    const pkgPath = `"${path.join(process.cwd(), `/${packageName}`)}"`;

    const { modules, dependencies, digest } = Client.buildPackage(pkgPath);

    const tx = new TransactionBlock();
    const cap = tx.object(onChain.getUpgradeCapID());

    const ticket = tx.moveCall({
        target: "0x2::package::authorize_upgrade",
        arguments: [cap, tx.pure(UpgradePolicy.COMPATIBLE), tx.pure(digest)]
    });

    const receipt = tx.upgrade({
        modules,
        dependencies,
        packageId: onChain.getPackageID(),
        ticket
    });

    tx.moveCall({
        target: "0x2::package::commit_upgrade",
        arguments: [cap, receipt]
    });

    tx.setSender(ms_wallet);

    const txBytes = toB64(
        await tx.build({ provider, onlyTransactionKind: false })
    );

    console.log(JSON.stringify({ txBytes }));
}

main();
