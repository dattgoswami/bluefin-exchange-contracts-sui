import { BigNumber } from "../../submodules/library-sui";

export interface TestPositionExpect {
    isPosPositive: boolean;
    mro: BigNumber;
    oiOpen: BigNumber;
    qPos: BigNumber;
    margin: BigNumber;
    pPos: BigNumber;
    marginRatio: BigNumber;
    bankBalance: BigNumber;
    pnl: BigNumber;
}

export interface expectedPosition {
    mro: number;
    oiOpen: number;
    qPos: number;
    margin: number;
    marginRatio: number;
    pPos: number;
    bankBalance?: number;
    pnl?: number;
}

export interface TestCase {
    pOracle?: number;
    tradeType?: string;
    price?: number;
    size?: number;
    leverage?: number;
    isTaker?: boolean;
    settlementAmount?: number;
    addMargin?: number;
    removeMargin?: number;
    adjustLeverage?: number;
    settlementAmtDueByMaker?: number;
    expectError?: number;
    expectMaker?: expectedPosition;
    expectTaker?: expectedPosition;
    expectLiquidator?: expectedPosition;
    expectCat?: expectedPosition;
    expectSystem?: {
        fee?: number;
        perpetual?: number;
        insurancePool?: number;
    };
}

export type TestCaseJSON = { [key: string]: TestCase[] };
