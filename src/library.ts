import BigNumber from "bignumber.js";

export type BigNumberable = BigNumber | number | string;

export const BASE_DECIMALS = 9;
export const BIGNUMBER_BASE = new BigNumber(1).shiftedBy(BASE_DECIMALS);

export const ADDRESSES = {
    ZERO: "0x0000000000000000000000000000000000000000"
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
