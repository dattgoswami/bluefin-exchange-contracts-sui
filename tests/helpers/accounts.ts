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
    },
    {
        phrase: "trim basket bicycle ticket penalty window tunnel fit insane orange virtual tennis",
        address: "0xb0d6401d9190b438af6b14969d9b43c5bc49bc28"
    },
    {
        phrase: "trim basket bicycle ticket penalty window tunnel fit insane orange tennis virtual",
        address: "0x4dcee3924d8f7e62e66140bdd539d7fe2184d2fb"
    },
    {
        phrase: "trim bicycle basket ticket penalty window tunnel fit insane orange virtual tennis",
        address: "0x839360602757bde481c821c489a6a14dd8042d08"
    },
    {
        phrase: "bicycle trim basket ticket penalty window tunnel fit insane orange virtual tennis",
        address: "0x994bcf2a1d7a695729f3458a42e94c0c5961b351"
    },
    {
        phrase: "basket trim bicycle ticket penalty window tunnel fit insane orange virtual tennis",
        address: "0xa43304e548808b8800977eb3fcd146c44130915b"
    },
    {
        phrase: "penalty bicycle basket ticket trim window tunnel fit insane orange virtual tennis",
        address: "0x13d65d3e50df131854d6dc8821953daac7a6efdb"
    }
];

export interface Account {
    signer: RawSigner;
    keyPair: Keypair;
    address: string;
    bankAccountId?: string;
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
