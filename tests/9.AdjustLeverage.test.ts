import { toBigNumberStr } from "../src/library";
import { executeTests } from "./helpers/executor";
import { MarketDetails } from "../src";
import { postDeployment } from "./helpers/utils";

// all tests are for taker
const adjustLeverage = {
    "Test # 1 - Long Position In Profit + Increase Leverage + Proceed": [
        {
            pOracle: 100,
            price: 100,
            size: -10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.25,
                bankBalance: 1700,
                pPos: 100
            }
        },
        {
            pOracle: 120,
            adjustLeverage: 5,
            expectTaker: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: 10,
                margin: 40,
                marginRatio: 0.2,
                bankBalance: 1910,
                pPos: 100
            }
        }
    ],
    "Test # 2 - Long Position In Loss + Increase Leverage + Proceed": [
        {
            pOracle: 100,
            price: 100,
            size: -10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.25,
                bankBalance: 1700,
                pPos: 100
            }
        },
        {
            pOracle: 85,
            adjustLeverage: 6,
            expectTaker: {
                mro: 0.166667,
                oiOpen: 1000,
                qPos: 10,
                margin: 291.666667,
                marginRatio: 0.166667,
                bankBalance: 1658.333333,
                pPos: 100
            }
        }
    ],
    "Test # 3 - Short Position In Profit + Increase Leverage + Proceed": [
        {
            pOracle: 100,
            price: 100,
            size: 10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.25,
                bankBalance: 1700,
                pPos: 100
            }
        },
        {
            pOracle: 85,
            adjustLeverage: 7,
            expectTaker: {
                mro: 0.143,
                oiOpen: 1000,
                qPos: -10,
                margin: 0,
                marginRatio: 0.176471,
                bankBalance: 1950,
                pPos: 100
            }
        }
    ],
    "Test # 4 - Short Position In Loss + Increase Leverage + Proceed": [
        {
            pOracle: 100,
            price: 100,
            size: 10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.25,
                bankBalance: 1700,
                pPos: 100
            }
        },
        {
            pOracle: 120,
            adjustLeverage: 7,
            expectTaker: {
                mro: 0.142857,
                oiOpen: 1000,
                qPos: -10,
                margin: 371.428571,
                marginRatio: 0.142857,
                bankBalance: 1578.571429,
                pPos: 100
            }
        }
    ],
    "Test # 5 - Long Position In Profit + Reduce Leverage + Proceed": [
        {
            pOracle: 100,
            price: 100,
            size: -10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.25,
                bankBalance: 1700,
                pPos: 100
            }
        },
        {
            pOracle: 120,
            adjustLeverage: 1,
            expectTaker: {
                mro: 1,
                oiOpen: 1000,
                qPos: 10,
                margin: 1000,
                marginRatio: 1,
                bankBalance: 950,
                pPos: 100
            }
        }
    ],
    "Test # 6 - Long Position In Loss + Reduce Leverage + Proceed": [
        {
            pOracle: 100,
            price: 100,
            size: -10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.25,
                bankBalance: 1700,
                pPos: 100
            }
        },
        {
            pOracle: 85,
            adjustLeverage: 3,
            expectTaker: {
                mro: 0.333333,
                oiOpen: 1000,
                qPos: 10,
                margin: 433.333333,
                marginRatio: 0.333333,
                bankBalance: 1516.666667,
                pPos: 100
            }
        }
    ],
    "Test # 7 - Short Position In Profit + Reduce Leverage + Proceed": [
        {
            pOracle: 100,
            price: 100,
            size: 10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.25,
                bankBalance: 1700,
                pPos: 100
            }
        },
        {
            pOracle: 85,
            adjustLeverage: 2,
            expectTaker: {
                mro: 0.5,
                oiOpen: 1000,
                qPos: -10,
                margin: 275,
                marginRatio: 0.5,
                bankBalance: 1675,
                pPos: 100
            }
        }
    ],
    "Test # 8 - Short Position In Loss + Reduce Leverage + Proceed": [
        {
            pOracle: 100,
            price: 100,
            size: 10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.25,
                bankBalance: 1700,
                pPos: 100
            }
        },
        {
            pOracle: 120,
            adjustLeverage: 1,
            expectTaker: {
                mro: 1,
                oiOpen: 1000,
                qPos: -10,
                margin: 1400,
                marginRatio: 1,
                bankBalance: 550,
                pPos: 100
            }
        }
    ],
    "Test # 9 - Long Position + Reduce Leverage more than Bank+ Error": [
        {
            pOracle: 100,
            price: 100,
            size: -35,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 3500,
                qPos: 35,
                margin: 875,
                marginRatio: 0.25,
                bankBalance: 950,
                pPos: 100
            }
        },
        {
            pOracle: 120,
            adjustLeverage: 1,
            expectError: 600
        }
    ],
    "Test # 10 - Short Position + Reduce Leverage more than Bank + Error": [
        {
            pOracle: 102,
            price: 100,
            size: 35,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 3500,
                qPos: -35,
                margin: 875,
                marginRatio: 0.22549,
                bankBalance: 950,
                pPos: 100,
                fee: 350
            }
        },
        {
            pOracle: 80,
            adjustLeverage: 1,
            expectError: 600
        }
    ],
    "Test # 11 - Zero Leverage + Error": [
        {
            pOracle: 100,
            price: 100,
            size: 10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.25,
                bankBalance: 1700,
                pPos: 100
            }
        },
        {
            pOracle: 110,
            adjustLeverage: 0,
            expectError: 504
        }
    ]
};

describe("Adjust Leverage", () => {
    const marketConfig: MarketDetails = {
        makerFee: toBigNumberStr(0.05),
        takerFee: toBigNumberStr(0.05),
        initialMarginRequired: toBigNumberStr(0.0625),
        maintenanceMarginRequired: toBigNumberStr(0.05),
        maxAllowedPriceDiffInOP: toBigNumberStr(100)
    };

    executeTests(adjustLeverage, marketConfig, postDeployment);
});
