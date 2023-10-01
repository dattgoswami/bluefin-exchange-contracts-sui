import {
    DeploymentConfigs,
    TransactionBlock
} from "../submodules/library-sui/dist";
import path from "path";
import {
    readFile,
    getProvider,
    getSignerFromSeed
} from "../submodules/library-sui/dist";
import { OnChainCalls } from "../submodules/library-sui";
import { packageName } from "../submodules/library-sui";
import { UpgradePolicy } from "@mysten/sui.js";
import { Transaction } from "../submodules/library-sui";
import { Client } from "../src/Client";

const deployment = readFile(DeploymentConfigs.filePath);

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

const onChain = new OnChainCalls(ownerSigner, deployment);

async function main() {
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

    const result = await ownerSigner.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
            showEffects: true,
            showObjectChanges: true
        }
    });

    if (Transaction.getStatus(result) != "success") {
        console.error("Upgrade failed!");
        console.dir(result, { depth: null, colors: true });
    } else {
        const newPackageId = Transaction.getCreatedObjectIDs(result)[0];
        console.log("New Package id: ", newPackageId);
    }
}

main();
