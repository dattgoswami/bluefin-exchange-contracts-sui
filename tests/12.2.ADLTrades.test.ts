import { DEFAULT } from "../src/defaults";
import { toBigNumberStr } from "../src/library";
import { executeTests } from "./helpers/executor";
import { MarketDetails } from "../src";
import { TestCaseJSON } from "./helpers/interfaces";

const tests: TestCaseJSON = {
    "# 1 - Long Position + Full deleveraging": [
        {
            tradeType: "normal",
            pOracle: 102,
            price: 100,
            size: 10,
            leverage: 4,
            expectMaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.264706,
                bankBalance: 1730,
                pPos: 100
            }
        },
        {
            tradeType: "adl_filler",
            pOracle: 100,
            price: 100,
            size: -10,
            leverage: 1,
            expectCat: {
                mro: 1,
                oiOpen: 1000,
                qPos: -10,
                margin: 1000,
                marginRatio: 1,
                bankBalance: 3980,
                pPos: 100
            }
        },
        {
            tradeType: "deleveraging",
            pOracle: 70,
            size: 10,
            settlementAmtDueByMaker: 0,
            expectMaker: {
                mro: 0,
                oiOpen: 0,
                qPos: 0,
                margin: 0,
                marginRatio: 1,
                bankBalance: 1730,
                pPos: 0,
                pnl: -250
            },
            expectCat: {
                mro: 0,
                oiOpen: 0,
                qPos: 0,
                margin: 0,
                marginRatio: 1,
                bankBalance: 5230,
                pPos: 0,
                pnl: 250
            },
            expectSystem: {
                fee: 140,
                perpetual: 1250
            }
        }
    ],
    "#2 - Short Position + Full deleveraging": [
        {
            tradeType: "normal",
            pOracle: 100,
            price: 100,
            size: -10,
            leverage: 4,
            expectMaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.25,
                bankBalance: 1730,
                pPos: 100
            }
        },
        {
            tradeType: "adl_filler",
            pOracle: 100,
            price: 100,
            size: 20,
            leverage: 2,
            expectCat: {
                mro: 0.5,
                oiOpen: 2000,
                qPos: 20,
                margin: 1000,
                marginRatio: 0.5,
                bankBalance: 3960,
                pPos: 100
            }
        },
        {
            tradeType: "deleveraging",
            pOracle: 130,
            size: 10,
            settlementAmtDueByMaker: 0,
            expectMaker: {
                mro: 0,
                oiOpen: 0,
                qPos: 0,
                margin: 0,
                marginRatio: 1,
                bankBalance: 1730,
                pPos: 0,
                pnl: -250
            },
            expectCat: {
                mro: 0.5,
                oiOpen: 1000,
                qPos: 10,
                margin: 500,
                marginRatio: 0.6153846154,
                bankBalance: 4710,
                pPos: 100,
                pnl: 250
            },
            expectSystem: {
                fee: 210,
                perpetual: 1750
            }
        }
    ],
    "#3 - Short Position + Partial deleveraging": [
        {
            tradeType: "normal",
            pOracle: 99,
            price: 100,
            size: -10,
            leverage: 5,
            expectMaker: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: -10,
                margin: 200,
                marginRatio: 0.212121,
                bankBalance: 1780,
                pPos: 100
            }
        },
        {
            tradeType: "adl_filler",
            pOracle: 100,
            price: 100,
            size: 20,
            leverage: 2,
            expectCat: {
                mro: 0.5,
                oiOpen: 2000,
                qPos: 20,
                margin: 1000,
                marginRatio: 0.5,
                bankBalance: 3960,
                pPos: 100
            }
        },
        {
            tradeType: "deleveraging",
            pOracle: 125,
            size: 5,
            settlementAmtDueByMaker: 0,
            expectMaker: {
                mro: 0.2,
                oiOpen: 500,
                qPos: -5,
                margin: 100,
                marginRatio: -0.04,
                bankBalance: 1780,
                pPos: 100,
                pnl: -100
            },
            expectCat: {
                mro: 0.5,
                oiOpen: 1500,
                qPos: 15,
                margin: 750,
                marginRatio: 0.6,
                bankBalance: 4310,
                pPos: 100,
                pnl: 100
            },
            expectSystem: {
                fee: 210,
                perpetual: 2050
            }
        }
    ]
};

describe("ADL Trades", () => {
    const marketConfig: MarketDetails = {
        initialMarginRequired: toBigNumberStr(0.0625),
        maintenanceMarginRequired: toBigNumberStr(0.05),
        insurancePoolRatio: toBigNumberStr(0.1),
        tickSize: toBigNumberStr(0.000001),
        makerFee: toBigNumberStr(0.02),
        takerFee: toBigNumberStr(0.05),
        maxAllowedFR: toBigNumberStr(1000), // 1000x% max allowed FR
        maxAllowedPriceDiffInOP: toBigNumberStr(100000),
        maxPrice: toBigNumberStr(10000000),
        insurancePool: DEFAULT.INSURANCE_POOL_ADDRESS,
        feePool: DEFAULT.FEE_POOL_ADDRESS
    };

    executeTests(tests, marketConfig);
});
