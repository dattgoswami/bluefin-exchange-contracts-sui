import { requestGas } from "../../src/utils";
import { TEST_WALLETS } from "./accounts";

async function main() {
    for (const wallet of TEST_WALLETS) {
        await requestGas(wallet.address);
    }
}

main();
