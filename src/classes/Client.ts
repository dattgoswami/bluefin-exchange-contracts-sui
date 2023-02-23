import * as Networks from "../../networks.json";
import { execCommand } from "../utils";
import { wallet } from "../interfaces";

export class Client {
    static createWallet(): wallet {
        const phrase = execCommand("sui client new-address secp256k1");
        const match = phrase.match(/(?<=\[)(.*?)(?=\])/g);
        return { address: match[0], phrase: match[1] } as wallet;
    }

    static switchEnv(env: String): boolean {
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

    static publishPackage(pkgPath: string) {
        return JSON.parse(
            execCommand(
                `sui client publish --gas-budget 30000 --json ${pkgPath} --skip-dependency-verification`
            )
        );
    }

    static buildPackage(pkgPath: string) {
        return JSON.parse(
            execCommand(
                `sui move build --dump-bytecode-as-base64 --path ${pkgPath}`
            )
        );
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
