import { Order } from "./interfaces";
import { bigNumber, toBigNumber } from "./library";
import { ADDRESSES } from "./library";

export const DEFAULT = {
    ORDER: {
        price: toBigNumber(1),
        quantity: toBigNumber(1),
        leverage: toBigNumber(1),
        isBuy: true,
        reduceOnly: false,
        triggerPrice: toBigNumber(0),
        maker: ADDRESSES.ZERO,
        expiration: bigNumber(3655643731),
        salt: bigNumber(1668690862116)
    } as Order,
    INSURANCE_POOL_ADDRESS: "0xb5F28C0acB63C18066775E7e64f14AbCDE750F2B",
    FEE_POOL_ADDRESS: "0x7b03b950861ce2954fe9CBf93Dd518dd6A785C9b",
    GAS_POOL_ADDRESS: "0xAA299b0f86B676053aBa0BBe65337fFEd52e6f9E",
    RANDOM_ACCOUNT_ADDRESS: "0xdC73EA68681290F17E2aDB82c5D115AEF30B6001"
};
