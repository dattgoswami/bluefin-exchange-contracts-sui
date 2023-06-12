import { requestGas, TEST_WALLETS } from "../../submodules/library-sui";

async function main() {
    for (const wallet of TEST_WALLETS) {
        await requestGas(wallet.address);
    }
}

main();
