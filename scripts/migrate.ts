import {
    DeploymentConfigs,
    TransactionBlock,
    writeFile
} from "../submodules/library-sui";
import {
    readFile,
    getProvider,
    getSignerFromSeed
} from "../submodules/library-sui";
import { OnChainCalls } from "../submodules/library-sui";
import { Transaction } from "../submodules/library-sui";

import { SuiMoveObject } from "@mysten/sui.js";
const deployment = readFile(DeploymentConfigs.filePath);

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

const onChain = new OnChainCalls(ownerSigner, deployment);

const stopTrading = async () => {
    const tx = new TransactionBlock();
    tx.moveCall({
        target: `${onChain.getPackageID()}::perpetual::set_trading_permit`,
        arguments: [
            tx.object(onChain.getSafeID()),
            tx.object(onChain.getGuardianCap()),
            tx.object(onChain.getPerpetualID("ETH-PERP")),
            tx.pure(false)
        ]
    });

    tx.moveCall({
        target: `${onChain.getPackageID()}::perpetual::set_trading_permit`,
        arguments: [
            tx.object(onChain.getSafeID()),
            tx.object(onChain.getGuardianCap()),
            tx.object(onChain.getPerpetualID("BTC-PERP")),
            tx.pure(false)
        ]
    });

    await executeTx(tx, false);
};

const stopBankWithdrawal = async () => {
    const tx = new TransactionBlock();
    tx.moveCall({
        target: `${onChain.getPackageID()}::margin_bank::set_withdrawal_status`,
        arguments: [
            tx.object(onChain.getSafeID()),
            tx.object(onChain.getGuardianCap()),
            tx.object(onChain.getBankID()),
            tx.pure(false)
        ],
        typeArguments: [onChain.getCurrencyType()]
    });

    await executeTx(tx, false);
};

const executeTx = async (
    txBlock: TransactionBlock,
    getID = true
): Promise<string | void> => {
    const response = await ownerSigner.signAndExecuteTransactionBlock({
        transactionBlock: txBlock,
        options: {
            showObjectChanges: true,
            showEffects: true,
            showEvents: true,
            showInput: true
        }
    });

    if (getID) {
        const id = Transaction.getCreatedObjectIDs(response, true)[0];
        console.log("-- id:", id);
        return id;
    }
};

const getKeys = async (id: string): Promise<string[]> => {
    const response = await provider.getDynamicFields({
        parentId: id
    });
    const keys = response.data.map((d) => d.name.value);
    return keys;
};

const migrateSubAccount = async () => {
    console.log("- Migrating SubAccounts");
    // get map id
    const obj = await provider.getObject({
        id: onChain.getSubAccountsID(),
        options: { showContent: true }
    });
    const mapId = (obj.data?.content as SuiMoveObject).fields.map.fields.id.id;

    // get keys from table
    const keys = await getKeys(mapId);

    const tx = new TransactionBlock();
    tx.moveCall({
        target: `${onChain.getPackageID()}::roles::migrate_sub_accounts`,
        arguments: [
            tx.object(onChain.getExchangeAdminCap()),
            tx.object(onChain.getSubAccountsID()),
            tx.pure(keys)
        ]
    });

    deployment["objects"]["SubAccounts"]["id"] = await executeTx(tx);
};

const migratePerpetual = async (perpName: string) => {
    console.log("- Migrating Perpetual:", perpName);

    const obj = await provider.getObject({
        id: onChain.getPerpetualID(perpName),
        options: { showContent: true }
    });
    const specialFeeMapID = (obj.data?.content as SuiMoveObject).fields
        .specialFee.fields.id.id;

    const positionKeys = await getKeys(onChain.getPositionsTableID(perpName));
    const specialFeeKeys = await getKeys(specialFeeMapID);

    const tx = new TransactionBlock();
    tx.moveCall({
        target: `${onChain.getPackageID()}::perpetual::migrate_perpetual`,
        arguments: [
            tx.object(onChain.getExchangeAdminCap()),
            tx.object(onChain.getBankID()),
            tx.object(onChain.getPerpetualID(perpName)),
            tx.pure(positionKeys),
            tx.pure(specialFeeKeys)
        ],
        typeArguments: [onChain.getCurrencyType()]
    });

    deployment["markets"][perpName]["Objects"]["Perpetual"]["id"] =
        await executeTx(tx);
    console.log("-- Remember to get the PositionsTable and BankAccount id!");
};

const migrateSafe = async () => {
    console.log("- Migrating CapabilitiesSafe");

    const tx = new TransactionBlock();
    tx.moveCall({
        target: `${onChain.getPackageID()}::roles::migrate_safe`,
        arguments: [
            tx.object(onChain.getExchangeAdminCap()),
            tx.object(onChain.getSafeID())
        ]
    });

    deployment["objects"]["CapabilitiesSafe"]["id"] = await executeTx(tx);
};

const migrateBank = async () => {
    console.log("- Migrating Bank");

    // get keys from bank table
    const keys = await getKeys(onChain.getBankTableID());

    const tx = new TransactionBlock();
    tx.moveCall({
        target: `${onChain.getPackageID()}::margin_bank::migrate_bank`,
        arguments: [
            tx.object(onChain.getExchangeAdminCap()),
            tx.object(onChain.getBankID()),
            tx.pure(keys)
        ],
        typeArguments: [onChain.getCurrencyType()]
    });
    deployment["objects"]["Bank"]["id"] = await executeTx(tx);
    console.log("-- Remember to get the BankTable id!");
};

(async () => {
    console.log("-> Performing on-chain migration! <-");

    console.log("- Stopping trading on ETH/BTC Perps");
    await stopTrading();

    console.log("- Stopping Bank Withdrawals");
    await stopBankWithdrawal();

    console.log("\n-> Migrating Objects <-");

    // sub accounts
    await migrateSubAccount();

    // capabilities safe
    await migrateSafe();

    // perpetuals
    await migratePerpetual("ETH-PERP");
    await migratePerpetual("BTC-PERP");

    // bank
    await migrateBank();

    console.log("\n-> Creating Sequencer <-");

    // create sequencer object
    const resp = await onChain.createSequencer();
    const id = Transaction.getCreatedObjectIDs(resp)[0];
    console.log("-- id: ", id);
    deployment["objects"]["Sequencer"] = {
        id,
        owner: "Shared",
        dataType: "Sequencer"
    };

    await writeFile(DeploymentConfigs.filePath, deployment);
    console.log(
        `Object details written to file: ${DeploymentConfigs.filePath}`
    );
})();
