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
