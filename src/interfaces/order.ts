import { SuiAddress } from "@mysten/sui.js";
import BigNumber from "bignumber.js";

export interface Order {
    isBuy: boolean;
    reduceOnly: boolean;
    quantity: BigNumber;
    price: BigNumber;
    triggerPrice: BigNumber;
    leverage: BigNumber;
    maker: SuiAddress;
    expiration: BigNumber;
    salt: BigNumber;
}

export interface SignedOrder extends Order {
    typedSignature: string;
}