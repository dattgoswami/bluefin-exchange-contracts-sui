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

export interface Account {
    signer: RawSigner;
    keyPair: Keypair;
    address: string;
}

export interface MakerTakerAccounts {
    maker: Account;
    taker: Account;
}

export function getTestAccounts(provider: JsonRpcProvider): Account[] {
    const accounts: Account[] = [];

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
    provider: JsonRpcProvider,
    createNew = false
): MakerTakerAccounts {
    if (createNew) {
        return {
            maker: createAccount(provider),
            taker: createAccount(provider)
        };
    } else {
        return {
            maker: {
                signer: getSignerFromSeed(TEST_WALLETS[0].phrase, provider),
                keyPair: getKeyPairFromSeed(TEST_WALLETS[0].phrase),
                address: TEST_WALLETS[0].address
            },
            taker: {
                signer: getSignerFromSeed(TEST_WALLETS[1].phrase, provider),
                keyPair: getKeyPairFromSeed(TEST_WALLETS[1].phrase),
                address: TEST_WALLETS[1].address
            }
        };
    }
}

export function createAccount(provider: JsonRpcProvider): Account {
    const wallet = Client.createWallet();
    return {
        signer: getSignerFromSeed(wallet.phrase, provider),
        keyPair: getKeyPairFromSeed(wallet.phrase),
        address: wallet.address
    };
}
