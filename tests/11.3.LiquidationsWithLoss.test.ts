import { DEFAULT } from "../submodules/library-sui/src/defaults";
import { toBigNumberStr, MarketDetails } from "../submodules/library-sui";
import { executeTests, TestCaseJSON } from "./helpers";

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
            tradeType: "liquidator_cat",
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
            tradeType: "liquidator_cat",
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
            tradeType: "liquidator_cat",
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
                tradeType: "liquidator_cat",
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
            tradeType: "liquidator_cat",
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
            tradeType: "liquidator_cat",
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
        initialMarginReq: toBigNumberStr(0.0625),
        maintenanceMarginReq: toBigNumberStr(0.05),
        insurancePoolRatio: toBigNumberStr(0.1),
        tickSize: toBigNumberStr(0.000001),
        defaultMakerFee: toBigNumberStr(0.02),
        defaultTakerFee: toBigNumberStr(0.05),
        maxFundingRate: toBigNumberStr(1000), // 1000x% max allowed FR
        maxAllowedPriceDiffInOP: toBigNumberStr(100000),
        maxOrderPrice: toBigNumberStr(10000000),
        insurancePool: DEFAULT.INSURANCE_POOL_ADDRESS,
        feePool: DEFAULT.FEE_POOL_ADDRESS
    };

    executeTests(tests, marketConfig, {
        traders: 200_000,
        liquidator: 500_000
    });
});
