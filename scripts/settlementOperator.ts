import * as yargs from "yargs";
import { config } from "dotenv";
import {
    getProvider,
    getSignerFromSeed,
    readFile,
    requestGas,
    writeFile
} from "../src/utils";
import { DeploymentConfigs } from "../src/DeploymentConfig";
import { Client, OnChainCalls, Transaction } from "../src";

config({ path: ".env" });

const argv = yargs
    .options({
        numOperators: {
            alias: "n",
            type: "number",
            demandOption: false,
            description:
                "number of settlement operators to be created. If provided then `account` and `path` flags are ignored"
        },
        account: {
            alias: "a",
            type: "string",
            demandOption: false,
            description:
                "address of the account, to be whitelisted as settlement operator"
        },
        path: {
            alias: "p",
            type: "string",
            demandOption: false,
            description:
                "json file path containing public addresses of account to be whitelisted as settlement operators"
        },
        fund: {
            alias: "f",
            type: "boolean",
            default: false,
            demandOption: false,
            description:
                "true if requires chain native tokens. 5 sui will be transferred to each operator"
        }
    })
    .parseSync();

const settlementOperator = async () => {
    const deployment = readFile(DeploymentConfigs.filePath);
    const provider = getProvider(
        DeploymentConfigs.network.rpc,
        DeploymentConfigs.network.faucet
    );
    const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
    const onChain = new OnChainCalls(ownerSigner, deployment);

    let accounts = [];
    let numOperators = 1;
    let iterator = 0;

    // if numOperators are provided, create N new wallets
    if (argv.numOperators) {
        console.log(`-> Creating ${argv.numOperators} operator accounts`);
        while (numOperators++ <= argv.numOperators) {
            const wallet = Client.createWallet();
            accounts.push({
                address: wallet.address,
                phrase: wallet.phrase,
                privateKey: "",
                capID: ""
            });
        }
        numOperators = argv.numOperators;
    }
    // if account is provided, then only this account is to be whitelisted as settlement operator
    else if (argv.account) {
        accounts.push({
            address: argv.account,
            phrase: "",
            privateKey: "",
            capID: ""
        });
    }
    // if a file path is provided, read operator addresses. All these accounts will be whitelisted
    else if (argv.path) {
        console.log(`-> Reading account address from file: ${argv.path}`);
        accounts = readFile(argv.path);
        numOperators = accounts.length;
    } else {
        // else create a single account for whitelisting
        const wallet = Client.createWallet();
        accounts.push({
            address: wallet.address,
            phrase: wallet.phrase,
            privateKey: "",
            capID: ""
        });
    }

    console.log(`-> Whitelisting ${numOperators} operator(s)`);

    while (iterator < numOperators) {
        const tx1 = await onChain.createSettlementOperator({
            operator: accounts[iterator].address
        });
        const settlementCapID = Transaction.getCreatedObjectIDs(tx1)[0];

        accounts[iterator].capID = settlementCapID;

        iterator++;
    }

    if (argv.fund) {
        console.log(`-> Funding operator account chain native token(s)`);
        iterator = 0;
        while (iterator < numOperators) {
            await requestGas(accounts[iterator].address);
            iterator++;
        }
    }

    const operators = deployment["objects"]["settlementOperators"] || [];
    deployment["objects"]["settlementOperators"] = operators.concat(accounts);

    writeFile(DeploymentConfigs.filePath, deployment);
    console.log(
        `-> Operator details written to: ${DeploymentConfigs.filePath}`
    );
};

settlementOperator();
