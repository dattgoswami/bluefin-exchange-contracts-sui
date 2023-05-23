import { JsonRpcProvider, Keypair, RawSigner } from "@mysten/sui.js";
import { Client } from "../../submodules/library-sui";
import { wallet } from "../../submodules/library-sui";
import { getKeyPairFromSeed, getSignerFromSeed } from "../../submodules/library-sui";

export const TEST_WALLETS: wallet[] = [
    {
        phrase: "trim bicycle fit ticket penalty basket window tunnel insane orange virtual tennis",
        address:
            "0x80c3d285c2fe5ccacd1a2fbc1fc757cbeab5134f1ef1e97803fe653e041c88aa"
    },
    {
        phrase: "trim basket bicycle fit ticket penalty window tunnel insane orange virtual tennis",
        address:
            "0x2183df5aaf6366e5445c95fa238fc223dbbda54b7c363680578b435f657f1a29"
    },
    {
        phrase: "trim basket bicycle ticket penalty window tunnel fit insane orange virtual tennis",
        address:
            "0xed2bb2ae1330a3abee7794e659add176b827e13532b31074ad01330df2d5c843"
    },
    {
        phrase: "trim basket bicycle ticket penalty window tunnel fit insane orange tennis virtual",
        address:
            "0x7f1c6310bb9224dc18e2e9943979b25250e38bf450b0c685e6242da4e083a657"
    },
    {
        phrase: "trim bicycle basket ticket penalty window tunnel fit insane orange virtual tennis",
        address:
            "0x49387e35ea98b0866ca7eced5dca8d6ca47124a4eaf815f54c7083afcb3ea980"
    },
    {
        phrase: "bicycle trim basket ticket penalty window tunnel fit insane orange virtual tennis",
        address:
            "0x01b51fb67313ae92f57418bc16aebd6134a6f39c388a77092cfdc4c639863d68"
    },
    {
        phrase: "basket trim bicycle ticket penalty window tunnel fit insane orange virtual tennis",
        address:
            "0xced4404d440912889b1e7484773fc10a8174d56baf260a6879eba29eb72df55a"
    },
    {
        phrase: "penalty bicycle basket ticket trim window tunnel fit insane orange virtual tennis",
        address:
            "0x8ca4d4d7d5adcbd77423852bc2c868c57893a470699e7a6e13aa45d15014fc2d"
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
