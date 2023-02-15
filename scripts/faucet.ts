import { config } from "dotenv";
import * as yargs from "yargs";
import { requestGas } from "../src/utils";

config({ path: ".env" });

const argv = yargs
    .options({
        sui: {
            alias: "s",
            type: "string",
            default: "0",
            demandOption: false,
            description: "amount of sui to fund. Default is 0"
        },
        account: {
            alias: "a",
            type: "string",
            demandOption: true,
            description: "address of account to be funded"
        }
    })
    .parseSync();

const faucet = async () => {
    await requestGas(argv.account);
};

faucet();
