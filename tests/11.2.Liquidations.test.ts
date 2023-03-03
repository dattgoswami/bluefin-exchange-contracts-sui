import { DEFAULT } from "../src/defaults";
import { toBigNumberStr } from "../src/library";
import { executeTests } from "./helpers/executor";
import { MarketDetails } from "../src";
import { TestCaseJSON } from "./helpers/interfaces";

const liquidationTests: TestCaseJSON = {
    "Test #1 Long Position + Full Liquidation": [
        {
            tradeType: "normal",
            pOracle: 99,
            price: 100,
            size: 10,
            leverage: 4,
            settlementAmount: 0,
            expectMaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.242424,
                bankBalance: 1730,
                pPos: 100
            }
        },
        {
            tradeType: "liquidation",
            pOracle: 78.947368,
            price: 0,
            size: 10,
            leverage: 1,
            settlementAmount: 0,
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
            expectLiquidator: {
                mro: 1,
                oiOpen: 789.47368,
                qPos: 10,
                margin: 789.47368,
                marginRatio: 1,
                bankBalance: 4246.052632,
                pPos: 78.947368,
                pnl: 35.526312
            },
            expectSystem: {
                fee: 70,
                insurancePool: 3.947368,
                perpetual: 1250
            }
        }
    ],
    "Test # 2 - Short Position + Full Liquidation": [
        {
            tradeType: "normal",
            pOracle: 99,
            price: 100,
            size: -10,
            leverage: 4,
            settlementAmount: 0,
            expectMaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.262626,
                bankBalance: 1730,
                pPos: 100
            }
        },
        {
            tradeType: "liquidation",
            pOracle: 119.047622,
            price: 0,
            size: -10,
            leverage: 1,
            settlementAmount: 0,
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
            expectLiquidator: {
                mro: 1,
                oiOpen: 1190.47622,
                qPos: -10,
                margin: 1190.47622,
                marginRatio: 1,
                bankBalance: 3863.095182,
                pPos: 119.047622,
                pnl: 53.571402
            },
            expectSystem: {
                fee: 70,
                insurancePool: 5.952378,
                perpetual: 1630.95244
            }
        }
    ],
    "Test # 3 - Long Position + Partial Liquidation": [
        {
            tradeType: "normal",
            pOracle: 99,
            price: 100,
            size: 10,
            leverage: 4,
            settlementAmount: 0,
            expectMaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.242424,
                bankBalance: 1730,
                pPos: 100
            }
        },
        {
            tradeType: "liquidation",
            pOracle: 78.947366,
            price: 0,
            size: 6,
            leverage: 1,
            settlementAmount: 0,
            expectMaker: {
                mro: 0.25,
                oiOpen: 400,
                qPos: 4,
                margin: 100,
                marginRatio: 0.05,
                bankBalance: 1730,
                pPos: 100,
                pnl: -150
            },
            expectLiquidator: {
                mro: 1,
                oiOpen: 473.684196,
                qPos: 6,
                margin: 473.684196,
                marginRatio: 1,
                bankBalance: 4547.6315804,
                pPos: 78.947366,
                pnl: 21.3157764
            },
            expectSystem: {
                fee: 70,
                insurancePool: 2.36842,
                perpetual: 950
            }
        }
    ],
    "Test # 4 - Short Position + Partial Liquidation": [
        {
            tradeType: "normal",
            pOracle: 99,
            price: 100,
            size: -10,
            leverage: 4,
            settlementAmount: 0,
            expectMaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.262626,
                bankBalance: 1730,
                pPos: 100
            }
        },
        {
            tradeType: "liquidation",
            pOracle: 119.047622,
            price: 0,
            size: -6,
            leverage: 1,
            settlementAmount: 0,
            expectMaker: {
                mro: 0.25,
                oiOpen: 400,
                qPos: -4,
                margin: 100,
                marginRatio: 0.05,
                bankBalance: 1730,
                pPos: 100,
                pnl: -150
            },
            expectLiquidator: {
                mro: 1,
                oiOpen: 714.285732,
                qPos: -6,
                margin: 714.285732,
                marginRatio: 1,
                bankBalance: 4317.857109,
                pPos: 119.047622,
                pnl: 32.142841
            },
            expectSystem: {
                fee: 70,
                insurancePool: 3.571427,
                perpetual: 1178.571464
            }
        }
    ],
    "Test # 5 - Long Position + Full Underwater Liquidation": [
        {
            tradeType: "normal",
            pOracle: 102,
            price: 100,
            size: 10,
            leverage: 4,
            settlementAmount: 0,
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
            tradeType: "liquidation",
            pOracle: 69.999998,
            price: 0,
            size: 10,
            leverage: 1,
            settlementAmount: 0,
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
            expectLiquidator: {
                mro: 1,
                oiOpen: 699.99998,
                qPos: 10,
                margin: 699.99998,
                marginRatio: 1,
                bankBalance: 4250,
                pPos: 69.999998,
                pnl: -50.00002
            },
            expectSystem: {
                fee: 70,
                insurancePool: 0,
                perpetual: 1250
            }
        }
    ],
    "Test # 6 - Short Position + Full Underwater Liquidation": [
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
            tradeType: "liquidation",
            pOracle: 137.500002,
            price: 0,
            size: -10,
            leverage: 1,
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
            expectLiquidator: {
                mro: 1,
                oiOpen: 1375.00002,
                qPos: -10,
                margin: 1375.00002,
                marginRatio: 1,
                bankBalance: 3499.99996,
                pPos: 137.500002,
                pnl: -125.00002
            },
            expectSystem: {
                fee: 70,
                insurancePool: 0,
                perpetual: 2000.00004
            }
        }
    ],
    "Test # 7 - Long Position + Full Underwater Liquidation": [
        {
            tradeType: "normal",
            pOracle: 100,
            price: 100,
            size: 10,
            leverage: 5,
            settlementAmount: 0,
            expectMaker: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: 10,
                margin: 200,
                marginRatio: 0.2,
                bankBalance: 1780,
                pPos: 100
            }
        },
        {
            tradeType: "liquidation",
            pOracle: 69.999998,
            price: 0,
            size: 10,
            leverage: 1,
            settlementAmount: 0,
            expectMaker: {
                mro: 0,
                oiOpen: 0,
                qPos: 0,
                margin: 0,
                marginRatio: 1,
                bankBalance: 1780,
                pPos: 0,
                pnl: -200
            },
            expectLiquidator: {
                mro: 1,
                oiOpen: 699.99998,
                qPos: 10,
                margin: 699.99998,
                marginRatio: 1,
                bankBalance: 4200,
                pPos: 69.999998,
                pnl: -100.00002
            },
            expectSystem: {
                fee: 70,
                insurancePool: 0,
                perpetual: 1200
            }
        }
    ],
    "Test # 8 - Short Position + Partial Underwater Liquidation": [
        {
            tradeType: "normal",
            pOracle: 99,
            price: 100,
            size: -10,
            leverage: 5,
            settlementAmount: 0,
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
            tradeType: "liquidation",
            pOracle: 130.000002,
            price: 0,
            size: -10,
            leverage: 1,
            settlementAmount: 0,
            expectMaker: {
                mro: 0,
                oiOpen: 0,
                qPos: 0,
                margin: 0,
                marginRatio: 1,
                bankBalance: 1780,
                pPos: 0,
                pnl: -200
            },
            expectLiquidator: {
                mro: 1,
                oiOpen: 1300.00002,
                qPos: -10,
                margin: 1300.00002,
                marginRatio: 1,
                bankBalance: 3599.99996,
                pPos: 130.000002,
                pnl: -100.00002
            },
            expectSystem: {
                fee: 70,
                insurancePool: 0,
                perpetual: 1800.00004
            }
        }
    ],
    "Test # 9 - Long Position + Full Liquidation (Liquidator Increases Position)":
        [
            {
                tradeType: "normal",
                pOracle: 100,
                price: 100,
                size: 10,
                leverage: 4,
                settlementAmount: 0,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1000,
                    qPos: 10,
                    margin: 250,
                    marginRatio: 0.25,
                    bankBalance: 1730,
                    pPos: 100
                }
            },
            {
                tradeType: "liquidator_bob",
                pOracle: 100,
                price: 100,
                size: 5,
                leverage: 1,
                settlementAmount: 0,
                expectLiquidator: {
                    mro: 1,
                    oiOpen: 500,
                    qPos: 5,
                    margin: 500,
                    marginRatio: 1,
                    bankBalance: 4490,
                    pPos: 100
                }
            },
            {
                tradeType: "liquidation",
                pOracle: 78.947366,
                price: 0,
                size: 10,
                leverage: 1,
                settlementAmount: 0,
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
                expectLiquidator: {
                    mro: 1,
                    oiOpen: 1289.47366,
                    qPos: 15,
                    margin: 1289.47366,
                    marginRatio: 1,
                    bankBalance: 3736.052634,
                    pPos: 85.964911,
                    pnl: 35.526294
                },
                expectSystem: {
                    fee: 105,
                    insurancePool: 3.947366,
                    perpetual: 3000
                }
            }
        ],
    "Test # 10 - Short Position + Full Liquidation (Liquidator Increases Position)":
        [
            {
                tradeType: "normal",
                pOracle: 102,
                price: 100,
                size: -10,
                leverage: 4,
                settlementAmount: 0,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1000,
                    qPos: -10,
                    margin: 250,
                    marginRatio: 0.22549,
                    bankBalance: 1730,
                    pPos: 100
                }
            },
            {
                tradeType: "liquidator_bob",
                pOracle: 102,
                price: 100,
                size: -10,
                leverage: 2,
                settlementAmount: 0,
                expectLiquidator: {
                    mro: 0.5,
                    oiOpen: 1000,
                    qPos: -10,
                    margin: 500,
                    marginRatio: 0.471,
                    bankBalance: 4480,
                    pPos: 100
                }
            },
            {
                tradeType: "liquidation",
                pOracle: 119.047622,
                price: 0,
                size: -10,
                leverage: 2,
                settlementAmount: 0,
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
                expectLiquidator: {
                    mro: 0.5,
                    oiOpen: 2190.47622,
                    qPos: -20,
                    margin: 1095.23811,
                    marginRatio: 0.3799999,
                    bankBalance: 3938.333292,
                    pPos: 109.523811,
                    pnl: 53.571402
                },
                expectSystem: {
                    fee: 140,
                    insurancePool: 5.952378,
                    perpetual: 2275.71433
                }
            }
        ],
    "Test # 11 - Long Position + Full Liquidation (Liquidator Nets Position)": [
        {
            tradeType: "normal",
            pOracle: 101,
            price: 100,
            size: 10,
            leverage: 4,
            settlementAmount: 0,
            expectMaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.257426,
                bankBalance: 1730,
                pPos: 100
            }
        },
        {
            tradeType: "liquidator_bob",
            pOracle: 101,
            price: 100,
            size: -20,
            leverage: 1,
            settlementAmount: 0,
            expectLiquidator: {
                mro: 1,
                oiOpen: 2000,
                qPos: -20,
                margin: 2000,
                marginRatio: 0.980198,
                bankBalance: 2960,
                pPos: 100
            }
        },
        {
            tradeType: "liquidation",
            pOracle: 78.947366,
            price: 0,
            size: 10,
            leverage: 1,
            settlementAmount: 0,
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
            expectLiquidator: {
                mro: 1,
                oiOpen: 1000,
                qPos: -10,
                margin: 1000,
                marginRatio: 1.533333,
                bankBalance: 4206.052634,
                pPos: 100,
                pnl: 246.052634
            },
            expectSystem: {
                fee: 210,
                insurancePool: 3.947366,
                perpetual: 2000
            }
        }
    ],
    "Test # 12 - Short Position + Full Liquidation (Liquidator Nets Position)":
        [
            {
                tradeType: "normal",
                pOracle: 100,
                price: 100,
                size: -10,
                leverage: 4,
                settlementAmount: 0,
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
                tradeType: "liquidator_bob",
                pOracle: 100,
                price: 100,
                size: 20,
                leverage: 1,
                settlementAmount: 0,
                expectLiquidator: {
                    mro: 1,
                    oiOpen: 2000,
                    qPos: 20,
                    margin: 2000,
                    marginRatio: 1,
                    bankBalance: 2960,
                    pPos: 100
                }
            },
            {
                tradeType: "liquidation",
                pOracle: 119.047622,
                price: 0,
                size: -10,
                leverage: 1,
                settlementAmount: 0,
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
                expectLiquidator: {
                    mro: 1,
                    oiOpen: 1000,
                    qPos: 10,
                    margin: 1000,
                    marginRatio: 1,
                    bankBalance: 4204.047622,
                    pPos: 100,
                    pnl: 244.047622
                },
                expectSystem: {
                    fee: 210,
                    insurancePool: 5.952378,
                    perpetual: 2000
                }
            }
        ],
    "Test # 13 - Long Position + Full Liquidation (Liquidator Flips Position)":
        [
            {
                tradeType: "normal",
                pOracle: 101,
                price: 100,
                size: 10,
                leverage: 4,
                settlementAmount: 0,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1000,
                    qPos: 10,
                    margin: 250,
                    marginRatio: 0.257426,
                    bankBalance: 1730,
                    pPos: 100
                }
            },
            {
                tradeType: "liquidator_bob",
                pOracle: 101,
                price: 100,
                size: -4,
                leverage: 1,
                settlementAmount: 0,
                expectLiquidator: {
                    mro: 1,
                    oiOpen: 400,
                    qPos: -4,
                    margin: 400,
                    marginRatio: 0.980198,
                    bankBalance: 4592,
                    pPos: 100
                }
            },
            {
                tradeType: "liquidation",
                pOracle: 78,
                price: 0,
                size: 10,
                leverage: 1,
                settlementAmount: 0,
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
                expectLiquidator: {
                    mro: 1,
                    oiOpen: 468,
                    qPos: 6,
                    margin: 468,
                    marginRatio: 1,
                    bankBalance: 4639,
                    pPos: 78,
                    pnl: 115
                },
                expectSystem: {
                    fee: 98,
                    insurancePool: 3,
                    perpetual: 1212
                }
            }
        ],
    "Test # 14 - Short Position + Full Liquidation": [
        {
            tradeType: "normal",
            pOracle: 100,
            price: 100,
            size: -10,
            leverage: 4,
            settlementAmount: 0,
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
            tradeType: "liquidator_bob",
            pOracle: 100,
            price: 100,
            size: 4,
            leverage: 1,
            settlementAmount: 0,
            expectLiquidator: {
                mro: 1,
                oiOpen: 400,
                qPos: 4,
                margin: 400,
                marginRatio: 1,
                bankBalance: 4592,
                pPos: 100
            }
        },
        {
            tradeType: "liquidation",
            pOracle: 120,
            price: 0,
            size: -10,
            leverage: 1,
            settlementAmount: 0,
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
            expectLiquidator: {
                mro: 1,
                oiOpen: 720,
                qPos: -6,
                margin: 720,
                marginRatio: 1,
                bankBalance: 4397,
                pPos: 120,
                pnl: 125
            },
            expectSystem: {
                fee: 98,
                insurancePool: 5,
                perpetual: 1440
            }
        }
    ],
    "Test # 15 - Long Position + Partial Underwater Liquidation": [
        {
            tradeType: "normal",
            pOracle: 102,
            price: 100,
            size: 10,
            leverage: 4,
            settlementAmount: 0,
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
            tradeType: "liquidation",
            pOracle: 69.999998,
            price: 0,
            size: 6,
            leverage: 1,
            settlementAmount: 0,
            expectMaker: {
                mro: 0.25,
                oiOpen: 400,
                qPos: 4,
                margin: 100,
                marginRatio: -0.071429,
                bankBalance: 1730,
                pPos: 100,
                pnl: -150
            },
            expectLiquidator: {
                mro: 1,
                oiOpen: 419.999988,
                qPos: 6,
                margin: 419.999988,
                marginRatio: 1,
                bankBalance: 4550,
                pPos: 69.999998,
                pnl: -30.000012
            },
            expectSystem: {
                fee: 70,
                insurancePool: 0,
                perpetual: 950
            }
        }
    ],
    "Test # 16 - Short Position + Partial Underwater Liquidation": [
        {
            tradeType: "normal",
            pOracle: 100,
            price: 100,
            size: -10,
            leverage: 4,
            settlementAmount: 0,
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
            tradeType: "liquidation",
            pOracle: 137.500002,
            price: 0,
            size: -6,
            leverage: 1,
            settlementAmount: 0,
            expectMaker: {
                mro: 0.25,
                oiOpen: 400,
                qPos: -4,
                margin: 100,
                marginRatio: -0.090909,
                bankBalance: 1730,
                pPos: 100,
                pnl: -150
            },
            expectLiquidator: {
                mro: 1,
                oiOpen: 825.000012,
                qPos: -6,
                margin: 825.000012,
                marginRatio: 1,
                bankBalance: 4099.999976,
                pPos: 137.500002,
                pnl: -75.000012
            },
            expectSystem: {
                fee: 70,
                insurancePool: 0,
                perpetual: 1400.000024
            }
        }
    ]
};

describe("Liquidation Trades", () => {
    const marketConfig: MarketDetails = {
        initialMarginRequired: toBigNumberStr(0.0625),
        maintenanceMarginRequired: toBigNumberStr(0.05),
        insurancePoolRatio: toBigNumberStr(0.1),
        tickSize: toBigNumberStr(0.000001),
        makerFee: toBigNumberStr(0.02),
        takerFee: toBigNumberStr(0.05),
        maxAllowedFR: toBigNumberStr(1000), // 1000x% max allowed FR
        insurancePool: DEFAULT.INSURANCE_POOL_ADDRESS,
        feePool: DEFAULT.FEE_POOL_ADDRESS
    };

    executeTests(liquidationTests, marketConfig);
});
