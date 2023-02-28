import { toBigNumberStr } from "../src/library";
import { MarketDetails } from "../src";
import { executeTests } from "./helpers/executor";
import { TestCaseJSON } from "./helpers/interfaces";

const lossTests: TestCaseJSON = {
    "Test # 69 - Reducing Long Position, abs.Loss > Margin  + Error": [
        {
            pOracle: 100,
            price: 100,
            size: 10,
            leverage: 4,
            expectMaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.25,
                pPos: 100
            },
            expectSystem: { fee: 70 }
        },
        {
            pOracle: 100,
            price: 70,
            size: -6,
            leverage: 4,
            expectError: 46
        }
    ],
    "Test # 70 - Closing Long Position, abs.Loss > Margin  + Error": [
        {
            pOracle: 100,
            price: 100,
            size: 10,
            leverage: 4,
            expectMaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.25,
                pPos: 100
            },
            expectSystem: { fee: 70 }
        },

        {
            pOracle: 100,
            price: 70,
            size: -10,
            leverage: 4,
            expectError: 46
        }
    ],
    "Test # 71 - Flipping Long Position, abs.Loss > Margin  + Error": [
        {
            pOracle: 100,
            price: 100,
            size: 10,
            leverage: 4,
            expectMaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.25,
                pPos: 100
            },
            expectSystem: { fee: 70 }
        },

        {
            pOracle: 100,
            price: 70,
            size: -16,
            leverage: 4,
            expectError: 46
        }
    ],
    "Test # 72 - Reducing Short Position, abs.Loss > Margin  + Error": [
        {
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
                pPos: 100
            },
            expectSystem: { fee: 70 }
        },

        {
            pOracle: 100,
            price: 130,
            size: 6,
            leverage: 4,
            expectError: 46
        }
    ],
    "Test # 73 - Closing Short Position, abs.Loss > Margin  + Error": [
        {
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
                pPos: 100
            },
            expectSystem: { fee: 70 }
        },

        {
            pOracle: 100,
            price: 130,
            size: 10,
            leverage: 4,
            expectError: 46
        }
    ],
    "Test # 74 - Flipping Short Position, abs.Loss > Margin  + Error": [
        {
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
                pPos: 100
            },
            expectSystem: { fee: 70 }
        },

        {
            pOracle: 100,
            price: 130,
            size: 16,
            leverage: 4,
            expectError: 46
        }
    ],
    "Test # 75 - Reducing Long Position, abs.Loss < Margin, (Loss+Fee) > Margin + Proceed":
        [
            {
                pOracle: 100,
                price: 100,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1000,
                    qPos: 10,
                    margin: 250,
                    marginRatio: 0.25,
                    pPos: 100
                },
                expectSystem: { fee: 70 }
            },

            {
                pOracle: 100,
                price: 75.25,
                size: -6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 400,
                    qPos: 4,
                    margin: 100,
                    marginRatio: 0.25,
                    pPos: 100
                },
                expectSystem: { fee: 94.075 }
            }
        ],
    "Test # 76 - Closing Long Position, abs.Loss < Margin, (Loss+Fee) > Margin + Proceed":
        [
            {
                pOracle: 100,
                price: 100,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1000,
                    qPos: 10,
                    margin: 250,
                    marginRatio: 0.25,
                    pPos: 100
                },
                expectSystem: { fee: 70 }
            },

            {
                pOracle: 100,
                price: 75.25,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0,
                    oiOpen: 0,
                    qPos: 0,
                    margin: 0,
                    marginRatio: 1,
                    pPos: 0
                },
                expectSystem: { fee: 110.125 }
            }
        ],
    "Test # 77 - Flipping Long Position, abs.Loss < Margin, (Loss+Fee) > Margin + Proceed":
        [
            {
                pOracle: 100,
                price: 100,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1000,
                    qPos: 10,
                    margin: 250,
                    marginRatio: 0.25,
                    pPos: 100
                },
                expectSystem: { fee: 70 }
            },

            {
                pOracle: 80,
                price: 75.25,
                size: -16,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 451.5,
                    qPos: -6,
                    margin: 112.875,
                    marginRatio: 0.175781,
                    pPos: 75.25
                },
                expectSystem: { fee: 141.73 }
            }
        ],
    "Test # 78 - Reducing Short Position, abs.Loss < Margin, (Loss+Fee) > Margin + Proceed":
        [
            {
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
                    pPos: 100
                },
                expectSystem: { fee: 70 }
            },

            {
                pOracle: 100,
                price: 124.75,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 400,
                    qPos: -4,
                    margin: 100,
                    marginRatio: 0.25,
                    pPos: 100
                },
                expectSystem: { fee: 108.925 }
            }
        ],
    "Test # 79 - Closing Short Position, abs.Loss < Margin, (Loss+Fee) > Margin + Proceed":
        [
            {
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
                    pPos: 100
                },
                expectSystem: { fee: 70 }
            },

            {
                pOracle: 100,
                price: 124.75,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0,
                    oiOpen: 0,
                    qPos: 0,
                    margin: 0,
                    marginRatio: 1,
                    pPos: 0
                },
                expectSystem: { fee: 134.875 }
            }
        ],
    "Test # 80 - Flipping Short Position, abs.Loss < Margin, (Loss+Fee) > Margin + Proceed":
        [
            {
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
                    pPos: 100
                },
                expectSystem: { fee: 70 }
            },
            {
                pOracle: 100,
                price: 124.75,
                size: 16,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 748.5,
                    qPos: 6,
                    margin: 187.125,
                    marginRatio: 0.064375,
                    pPos: 124.75
                },
                expectSystem: { fee: 187.27 }
            }
        ]
};

describe("More Loss Than Margin", () => {
    const marketConfig: MarketDetails = {
        initialMarginRequired: toBigNumberStr(0.01),
        maintenanceMarginRequired: toBigNumberStr(0.001),
        tickSize: toBigNumberStr(0.0000001),
        mtbLong: toBigNumberStr(1),
        mtbShort: toBigNumberStr(0.99),
        makerFee: toBigNumberStr(0.02),
        takerFee: toBigNumberStr(0.05),
        maxAllowedPriceDiffInOP: toBigNumberStr(1000)
    };
    executeTests(lossTests, marketConfig);
});
