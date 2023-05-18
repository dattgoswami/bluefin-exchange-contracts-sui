import * as Networks from "../../networks.json";
import { execCommand } from "../utils";
import { wallet } from "../interfaces";
import {
    RawSigner,
    SuiTransactionBlockResponse,
    TransactionBlock
} from "@mysten/sui.js";

export class Client {
    static createWallet(): wallet {
        const phrase = execCommand("sui client new-address secp256k1");
        const match = phrase.match(/(?<=\[)(.*?)(?=\])/g) as RegExpMatchArray;
        return { address: match[0], phrase: match[1] } as wallet;
    }

    static switchEnv(env: string): boolean {
        try {
            // try to switch to env if already exists
            execCommand(`sui client switch --env ${env}`);
        } catch (e) {
            console.log(`Creating env: ${env}`);
            // // if not then create environment
            try {
                execCommand(
                    `sui client new-env --alias ${env} --rpc ${
                        (Networks as any)[env as any].rpc
                    }`
                );
            } catch (e) {
                console.log("Error switching to env");
                console.log(e);
                return false;
            }
        }
        console.log(`Switched client env to: ${env}`);
        return true;
    }

    static publishPackage(pkgPath: string): SuiTransactionBlockResponse {
        return JSON.parse(
            execCommand(
                `sui client publish --gas-budget 500000000 --json ${pkgPath} --skip-dependency-verification --skip-fetch-latest-git-deps`
            )
        );
    }

    static async publishPackageUsingSDK(
        deployer: RawSigner,
        pkgPath: string
    ): Promise<SuiTransactionBlockResponse> {
        const { modules, dependencies } = JSON.parse(
            execCommand(
                `sui move build --dump-bytecode-as-base64 --path ${pkgPath}`
            )
        );

        const tx = new TransactionBlock();

        const [upgradeCap] = tx.publish({ modules, dependencies });

        tx.transferObjects([upgradeCap], tx.pure(await deployer.getAddress()));

        const result = await deployer.signAndExecuteTransactionBlock({
            transactionBlock: tx,
            options: {
                showObjectChanges: true,
                showEffects: true,
                showEvents: true,
                showInput: true
            }
        });

        return result;
    }

    static buildPackage(pkgPath: string) {
        execCommand(`sui move build --path "${pkgPath}"`);
    }

    static switchAccount(address: string): boolean {
        try {
            execCommand(`sui client switch --address ${address}`);
            console.log(`Switched client account to: ${address}`);
            return true;
        } catch (e) {
            console.log(`Address ${address} does not exist on client`);
            return false;
        }
    }
}
