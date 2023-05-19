import BigNumber from "bignumber.js";
import { number, string } from "yargs";
import { Order, OrderFlags } from "./interfaces";

export type BigNumberable = BigNumber | number | string;
export type SignedNumber = {
    sign: boolean;
    value: string;
};

export const BASE_DECIMALS = 9;
export const BIGNUMBER_BASE = new BigNumber(1).shiftedBy(BASE_DECIMALS);

export const ADDRESSES = {
    ZERO: "0x0000000000000000000000000000000000000000000000000000000000000000"
};

const toBnBase = (base: number) => {
    return new BigNumber(1).shiftedBy(base);
};

export function bigNumber(val: BigNumberable): BigNumber {
    return new BigNumber(val);
}

export function toBigNumber(
    val: BigNumberable,
    base: number = BASE_DECIMALS
): BigNumber {
    return new BigNumber(val).multipliedBy(toBnBase(base));
}

export function toBigNumberStr(
    val: BigNumberable,
    base: number = BASE_DECIMALS
): string {
    return toBigNumber(val, base).toFixed(0);
}

export function bnToBaseStr(val: BigNumberable, decimals = 6): string {
    return bigNumber(val).shiftedBy(-BASE_DECIMALS).toFixed(decimals);
}

export function usdcToBaseNumber(val: BigNumberable, decimals = 6): number {
    return Number(new BigNumber(val).shiftedBy(-6).toFixed(decimals));
}

export function toBaseNumber(val: BigNumberable, decimals = 3): number {
    return Number(
        new BigNumber(val).shiftedBy(-BASE_DECIMALS).toFixed(decimals)
    );
}

export function bnToHex(bn: BigNumber | number, pad: number = 32): string {
    // u128 on chain = 16 bytes = 32 hex characters (2 char / byte)
    // u8 on chain = 1 byte = 2 hex characters
    return bn.toString(16).padStart(pad, "0");
}

export function hexToBuffer(hex: string): Buffer {
    if (hex?.toLowerCase().indexOf("x") !== -1) {
        hex = hex.substring(2);
    }

    return Buffer.from(hex, "hex");
}

export function base64ToBuffer(data: string): Buffer {
    return Buffer.from(data, "base64");
}
export function base64ToHex(data: string): string {
    return Buffer.from(data, "base64").toString("hex");
}

export function SignedNumberToBigNumber(number: SignedNumber) {
    return new BigNumber(
        number.sign ? number.value : -1 * Number(number.value)
    );
}

export function SignedNumberToBigNumberStr(number: SignedNumber, decimals = 2) {
    return SignedNumberToBigNumber(number).toFixed(decimals);
}

export function SignedNumberToBaseNumber(number: SignedNumber, decimals = 3) {
    return toBaseNumber(SignedNumberToBigNumber(number), decimals);
}

export function decodeOrderFlags(flagsValue: number): OrderFlags {
    const flags: OrderFlags = {
        ioc: (flagsValue & 1) > 0,
        postOnly: (flagsValue & 2) > 0,
        reduceOnly: (flagsValue & 4) > 0,
        isBuy: (flagsValue & 8) > 0,
        orderbookOnly: (flagsValue & 16) > 0
    };

    return flags;
}

export function encodeOrderFlags(order: Order): number {
    // 0th bit = ioc
    // 1st bit = postOnly
    // 2nd bit = reduceOnly
    // 3rd bit  = isBuy
    // 4th bit = orderbookOnly
    // e.g. 00000000 // all flags false
    // e.g. 00000001 // ioc order, sell side, can be executed by taker
    // e.e. 00010001 // same as above but can only be executed by settlement operator

    let value = 0;
    if (order.ioc) value += 1;

    if (order.postOnly) value += 2;

    if (order.reduceOnly) value += 4;

    if (order.isBuy) value += 8;

    if (order.orderbookOnly) value += 16;

    return value;
}
