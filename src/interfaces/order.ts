import { SuiAddress } from "@mysten/sui.js";
import BigNumber from "bignumber.js";

export interface Order {
    market: SuiAddress;
    maker: SuiAddress;
    isBuy: boolean;
    reduceOnly: boolean;
    postOnly: boolean;
    orderbookOnly: boolean;
    ioc: boolean;
    quantity: BigNumber;
    price: BigNumber;
    leverage: BigNumber;
    expiration: BigNumber;
    salt: BigNumber;
}

export interface OrderFlags {
    isBuy: boolean;
    reduceOnly: boolean;
    postOnly: boolean;
    orderbookOnly: boolean;
    ioc: boolean;
}

export interface SignedOrder extends Order {
    typedSignature: string;
}
