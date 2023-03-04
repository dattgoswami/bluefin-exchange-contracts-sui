import { SuiAddress } from "@mysten/sui.js";
import BigNumber from "bignumber.js";

export interface Order {
    market: SuiAddress;
    maker: SuiAddress;
    isBuy: boolean;
    reduceOnly: boolean;
    quantity: BigNumber;
    price: BigNumber;
    leverage: BigNumber;
    expiration: BigNumber;
    salt: BigNumber;
}

export interface SignedOrder extends Order {
    typedSignature: string;
}
