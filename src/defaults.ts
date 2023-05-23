import { Order } from "./interfaces";
import { bigNumber, toBigNumber } from "./library";
import { ADDRESSES } from "./library";

export const DEFAULT = {
    ORDER: {
        market: "0x42083ae11fff754c2a2998cf6fc6c65ab136b5ab92f1e124d9259895ff13754b",
        price: toBigNumber(1),
        quantity: toBigNumber(1),
        leverage: toBigNumber(1),
        isBuy: true,
        reduceOnly: false,
        postOnly: false,
        orderbookOnly: true,
        maker: ADDRESSES.ZERO,
        expiration: bigNumber(1747984534000),
        salt: bigNumber(1668690862116)
    } as Order,
    INSURANCE_POOL_ADDRESS:
        "0x90c55f2a388a0e31ebca93cbf87fdd08e9716be082ca8a3c479bb14bcb5e1b88",
    FEE_POOL_ADDRESS:
        "0x05ada716962dec8788b53ddad34827ffe46acfe16bfe9d7d064838fcda285073",
    GAS_POOL_ADDRESS:
        "0xefb4808ca08bd25f9edc4017d036ad8bd451d7674b11e0b322bc8b1a98d46e10",
    RANDOM_ACCOUNT_ADDRESS:
        "0x224425eda78a8fb607e9c83be22f68fdfabe36e5761306aff10b97cc0ba5e38c"
};
