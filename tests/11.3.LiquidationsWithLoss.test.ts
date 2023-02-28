import { DEFAULT } from "../src/defaults";
import { toBigNumberStr } from "../src/library";
import { executeTests } from "./helpers/executor";
import { MarketDetails } from "../src";
import { TestCaseJSON } from "./helpers/interfaces";

const tests: TestCaseJSON = {
    "Test #1-Long Liquidation (Full) , Liquidator reduces with Loss > Margin": [
        {
            tradeType: "normal",
            pOracle: 500,
            price: 500,
            size: 10,
            leverage: 4
        },
        {
            tradeType: "liq_filler",
            pOracle: 100,
            price: 100,
            size: -14,
            leverage: 6
        },
        {
            tradeType: "liquidation",
            pOracle: 392,
            size: 10,
            leverage: 6,
            expectError: 47
        }
    ],
    "Test #2-Long Liquidation (Full) , Liquidator closes with Loss > Margin": [
        {
            tradeType: "normal",
            pOracle: 500,
            price: 500,
            size: 10,
            leverage: 4
        },
        {
            tradeType: "liq_filler",
            pOracle: 100,
            price: 100,
            size: -10,
            leverage: 6
        },
        {
            tradeType: "liquidation",
            pOracle: 392,
            size: 10,
            leverage: 6,
            expectError: 47
        }
    ],
    "Test #3-Long Liquidation (Full) , Liquidator flips with Loss > Margin": [
        {
            tradeType: "normal",
            pOracle: 500,
            price: 500,
            size: 10,
            leverage: 4
        },
        {
            tradeType: "liq_filler",
            pOracle: 100,
            price: 100,
            size: -6,
            leverage: 6
        },
        {
            tradeType: "liquidation",
            pOracle: 392,
            size: 10,
            leverage: 6,
            expectError: 47
        }
    ],
    "Test #4-Short Liquidation (Full) , Liquidator reduces with Loss > Margin":
        [
            {
                tradeType: "normal",
                pOracle: 500,
                price: 500,
                size: -10,
                leverage: 4
            },
            {
                tradeType: "liq_filler",
                pOracle: 700,
                price: 700,
                size: 14,
                leverage: 10
            },
            {
                tradeType: "liquidation",
                pOracle: 598,
                size: -10,
                leverage: 10,
                expectError: 47
            }
        ],
    "Test #5-Short Liquidation (Full) , Liquidator closes with Loss > Margin": [
        {
            tradeType: "normal",
            pOracle: 500,
            price: 500,
            size: -10,
            leverage: 4
        },
        {
            tradeType: "liq_filler",
            pOracle: 700,
            price: 700,
            size: 10,
            leverage: 10
        },
        {
            tradeType: "liquidation",
            pOracle: 598,
            size: -10,
            leverage: 10,
            expectError: 47
        }
    ],
    "Test #6-Short Liquidation (Full) , Liquidator flips with Loss > Margin": [
        {
            tradeType: "normal",
            pOracle: 500,
            price: 500,
            size: -10,
            leverage: 4
        },
        {
            tradeType: "liq_filler",
            pOracle: 700,
            price: 700,
            size: 6,
            leverage: 10
        },
        {
            tradeType: "liquidation",
            pOracle: 598,
            size: -10,
            leverage: 10,
            expectError: 47
        }
    ]
};

describe("Liquidation Trades with Loss > Margin", () => {
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
