import BigNumber from "bignumber.js";

export interface TestPositionExpect {
    isPosPositive: boolean;
    mro: BigNumber;
    oiOpen: BigNumber;
    qPos: BigNumber;
    margin: BigNumber;
    pPos: BigNumber;
    marginRatio: BigNumber;
    bankBalance: BigNumber;
    fee: BigNumber;
}

export interface MarketConfig {
    adminID?: string;
    name?: string;
    minPrice?: string;
    maxPrice?: string;
    tickSize?: string;
    minQty?: string;
    maxQtyLimit?: string;
    maxQtyMarket?: string;
    stepSize?: string;
    mtbLong?: string;
    mtbShort?: string;
    maxAllowedOIOpen?: string[];
    imr?: string;
    mmr?: string;
    makerFee?: string;
    takerFee?: string;
    maxAllowedPriceDiffInOP?: string;
}
