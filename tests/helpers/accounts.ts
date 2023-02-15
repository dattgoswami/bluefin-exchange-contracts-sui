import { JsonRpcProvider, Keypair, RawSigner } from "@mysten/sui.js";
import { Client } from "../../src";
import { wallet } from "../../src/interfaces";
import { getKeyPairFromSeed, getSignerFromSeed } from "../../src/utils";

export const TEST_WALLETS: wallet[] = [
    {
        phrase: "trim bicycle fit ticket penalty basket window tunnel insane orange virtual tennis",
        address: "0x9e61bd8cac66d89b78ebd145d6bbfbdd6ff550cf"
    },
    {
        phrase: "trim basket bicycle fit ticket penalty window tunnel insane orange virtual tennis",
        address: "0x9a363a0780493d20cd42dd7db9a99d3132d8f764"
    }
];

export interface TestAccount {
    signer: RawSigner;
    keyPair: Keypair;
    address: string;
}

export interface MakerTakerAccounts {
    maker: TestAccount;
    taker: TestAccount;
}

export function getTestAccounts(provider: JsonRpcProvider): TestAccount[] {
    const accounts: TestAccount[] = [];

    for (const wallet of TEST_WALLETS) {
        accounts.push({
            signer: getSignerFromSeed(wallet.phrase, provider),
            keyPair: getKeyPairFromSeed(wallet.phrase),
            address: wallet.address
        });
    }
    return accounts;
}

export function getMakerTakerAccounts(
    provider: JsonRpcProvider
): MakerTakerAccounts {
    const w1 = Client.createWallet();
    const w2 = Client.createWallet();
    return {
        maker: {
            signer: getSignerFromSeed(w1.phrase, provider),
            keyPair: getKeyPairFromSeed(w1.phrase),
            address: w1.address
        },
        taker: {
            signer: getSignerFromSeed(w2.phrase, provider),
            keyPair: getKeyPairFromSeed(w2.phrase),
            address: w2.address
        }
    };
}
