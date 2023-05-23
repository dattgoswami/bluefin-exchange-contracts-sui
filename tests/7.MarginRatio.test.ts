import { toBigNumberStr } from "../submodules/library-sui";
import { executeTests } from "./helpers/executor";
import { MarketDetails } from "../submodules/library-sui";
import { TestCaseJSON } from "./helpers/interfaces";

const mrTests: TestCaseJSON = {
    "Test # 1 - Case I: Long position, Long Order = Error on 3rd order": [
        {
            pOracle: 100,
            price: 100,
            size: 50,
            leverage: 5
        },
        {
            pOracle: 97,
            price: 97,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 88,
            price: 88,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 70,
            price: 70,
            size: 0.1,
            leverage: 5,
            expectError: 404
        },
        {
            pOracle: 90,
            price: 90,
            size: 0.1,
            leverage: 5
        }
    ],
    "Test # 1 - Case II: Long position, Long Order = Error on 3rd order": [
        {
            pOracle: 100,
            price: 100,
            size: 50,
            leverage: 5
        },
        {
            pOracle: 90,
            price: 90,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 88,
            price: 88,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 70,
            price: 70,
            size: 0.1,
            leverage: 5,
            expectError: 404
        },
        {
            pOracle: 97,
            price: 97,
            size: 0.1,
            leverage: 5
        }
    ],
    "Test # 1 - Case III: Long position, Long Order = Error on 3rd order": [
        {
            pOracle: 100,
            price: 100,
            size: 50,
            leverage: 5
        },

        {
            pOracle: 97,
            price: 97,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 90,
            price: 90,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 70,
            price: 70,
            size: 0.1,
            leverage: 5,
            expectError: 404
        },
        {
            pOracle: 88,
            price: 88,
            size: 0.1,
            leverage: 5
        }
    ],
    "Test # 1 - Case IV: Long position, Long Order = Error: `404`": [
        {
            pOracle: 100,
            price: 100,
            size: 50,
            leverage: 5
        },
        {
            pOracle: 97,
            price: 97,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 90,
            price: 90,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 88,
            price: 88,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 70,
            price: 70,
            size: 0.1,
            leverage: 5,
            expectError: 404
        }
    ],
    "Test # 2 - Case I: Long position, Long Order = Error on 3rd order": [
        {
            pOracle: 100,
            price: 100,
            size: 100,
            leverage: 10
        },

        {
            pOracle: 99,
            price: 99,
            size: 0.1,
            leverage: 10
        },
        {
            pOracle: 98,
            price: 98,
            size: 0.1,
            leverage: 10
        },
        {
            pOracle: 80,
            price: 80,
            size: 0.1,
            leverage: 10,
            expectError: 404
        },
        {
            pOracle: 95,
            price: 95,
            size: 0.1,
            leverage: 10
        }
    ],
    "Test # 2 - Case II: Long position, Long Order = Error on 3rd order": [
        {
            pOracle: 100,
            price: 100,
            size: 100,
            leverage: 10
        },

        {
            pOracle: 99,
            price: 99,
            size: 0.1,
            leverage: 10
        },
        {
            pOracle: 95,
            price: 95,
            size: 0.1,
            leverage: 10
        },
        {
            pOracle: 80,
            price: 80,
            size: 0.1,
            leverage: 10,
            expectError: 404
        },
        {
            pOracle: 98,
            price: 98,
            size: 0.1,
            leverage: 10
        }
    ],
    "Test # 2 - Case III: Long position, Long Order = Error on 3rd order": [
        {
            pOracle: 100,
            price: 100,
            size: 100,
            leverage: 10
        },

        {
            pOracle: 98,
            price: 98,
            size: 0.1,
            leverage: 10
        },
        {
            pOracle: 95,
            price: 95,
            size: 0.1,
            leverage: 10
        },
        {
            pOracle: 80,
            price: 80,
            size: 0.1,
            leverage: 10,
            expectError: 404
        },
        {
            pOracle: 99,
            price: 99,
            size: 0.1,
            leverage: 10
        }
    ],
    "Test # 2 - Case IV: Long position, Long Order = Error: `404`": [
        {
            pOracle: 100,
            price: 100,
            size: 100,
            leverage: 10
        },

        {
            pOracle: 99,
            price: 99,
            size: 0.1,
            leverage: 10
        },
        {
            pOracle: 98,
            price: 98,
            size: 0.1,
            leverage: 10
        },
        {
            pOracle: 95,
            price: 95,
            size: 0.1,
            leverage: 10
        },
        {
            pOracle: 80,
            price: 80,
            size: 0.1,
            leverage: 10,
            expectError: 404
        }
    ],
    "Test # 3 - Case I: Long position, Long Order = Error on 3rd order": [
        {
            pOracle: 100,
            price: 100,
            size: 50,
            leverage: 2
        },

        {
            pOracle: 95,
            price: 95,
            size: 0.1,
            leverage: 2
        },
        {
            pOracle: 90,
            price: 90,
            size: 0.1,
            leverage: 2
        },
        {
            pOracle: 45,
            price: 45,
            size: 0.1,
            leverage: 2,
            expectError: 404
        },
        {
            pOracle: 80,
            price: 80,
            size: 0.1,
            leverage: 2
        }
    ],
    "Test # 3 - Case II: Long position, Long Order = Error on 3rd order": [
        {
            pOracle: 100,
            price: 100,
            size: 50,
            leverage: 2
        },

        {
            pOracle: 90,
            price: 90,
            size: 0.1,
            leverage: 2
        },
        {
            pOracle: 80,
            price: 80,
            size: 0.1,
            leverage: 2
        },
        {
            pOracle: 45,
            price: 45,
            size: 0.1,
            leverage: 2,
            expectError: 404
        },
        {
            pOracle: 95,
            price: 95,
            size: 0.1,
            leverage: 2
        }
    ],
    "Test # 3 - Case III: Long position, Long Order = Error on 3rd order": [
        {
            pOracle: 100,
            price: 100,
            size: 50,
            leverage: 2
        },

        {
            pOracle: 95,
            price: 95,
            size: 0.1,
            leverage: 2
        },
        {
            pOracle: 80,
            price: 80,
            size: 0.1,
            leverage: 2
        },
        {
            pOracle: 45,
            price: 45,
            size: 0.1,
            leverage: 2,
            expectError: 404
        },
        {
            pOracle: 90,
            price: 90,
            size: 0.1,
            leverage: 2
        }
    ],
    "Test # 3 - Case IV: Long position, Long Order = Error: `404`": [
        {
            pOracle: 100,
            price: 100,
            size: 50,
            leverage: 2
        },

        {
            pOracle: 95,
            price: 95,
            size: 0.1,
            leverage: 2
        },
        {
            pOracle: 90,
            price: 90,
            size: 0.1,
            leverage: 2
        },
        {
            pOracle: 80,
            price: 80,
            size: 0.1,
            leverage: 2
        },
        {
            pOracle: 45,
            price: 45,
            size: 0.1,
            leverage: 2,
            expectError: 404
        }
    ],
    "Test # 4 - Case I: Short position, Short Order = Error on 3rd error": [
        {
            pOracle: 100,
            price: 100,
            size: -50,
            leverage: 5
        },

        {
            pOracle: 103,
            price: 103,
            size: -0.1,
            leverage: 5
        },
        {
            pOracle: 112,
            price: 112,
            size: -0.1,
            leverage: 5
        },
        {
            pOracle: 130,
            price: 130,
            size: -0.1,
            leverage: 5,
            expectError: 404
        },
        {
            pOracle: 110,
            price: 110,
            size: -0.1,
            leverage: 5
        }
    ],
    "Test # 4 - Case II: Short position, Short Order = Error on 3rd error": [
        {
            pOracle: 100,
            price: 100,
            size: -50,
            leverage: 5
        },

        {
            pOracle: 110,
            price: 110,
            size: -0.1,
            leverage: 5
        },
        {
            pOracle: 112,
            price: 112,
            size: -0.1,
            leverage: 5
        },
        {
            pOracle: 130,
            price: 130,
            size: -0.1,
            leverage: 5,
            expectError: 404
        },
        {
            pOracle: 103,
            price: 103,
            size: -0.1,
            leverage: 5
        }
    ],
    "Test # 4 - Case III: Short position, Short Order = Error on 3rd error": [
        {
            pOracle: 100,
            price: 100,
            size: -50,
            leverage: 5
        },

        {
            pOracle: 103,
            price: 103,
            size: -0.1,
            leverage: 5
        },
        {
            pOracle: 110,
            price: 110,
            size: -0.1,
            leverage: 5
        },
        {
            pOracle: 130,
            price: 130,
            size: -0.1,
            leverage: 5,
            expectError: 404
        },
        {
            pOracle: 112,
            price: 112,
            size: -0.1,
            leverage: 5
        }
    ],
    "Test # 4 - Case IV: Short position, Short Order = Error: `404`": [
        {
            pOracle: 100,
            price: 100,
            size: -50,
            leverage: 5
        },

        {
            pOracle: 103,
            price: 103,
            size: -0.1,
            leverage: 5
        },
        {
            pOracle: 110,
            price: 110,
            size: -0.1,
            leverage: 5
        },
        {
            pOracle: 112,
            price: 112,
            size: -0.1,
            leverage: 5
        },
        {
            pOracle: 130,
            price: 130,
            size: -0.1,
            leverage: 5,
            expectError: 404
        }
    ],
    "Test # 5 - Case I: Short position, Short Order = Error on 3rd error": [
        {
            pOracle: 100,
            price: 100,
            size: -100,
            leverage: 10
        },

        {
            pOracle: 101,
            price: 101,
            size: -0.1,
            leverage: 10
        },
        {
            pOracle: 103,
            price: 103,
            size: -0.1,
            leverage: 10
        },
        {
            pOracle: 120,
            price: 120,
            size: -0.1,
            leverage: 10,
            expectError: 404
        },
        {
            pOracle: 104,
            price: 104,
            size: -0.1,
            leverage: 10
        }
    ],
    "Test # 5 - Case II: Short position, Short Order = Error on 3rd error": [
        {
            pOracle: 100,
            price: 100,
            size: -100,
            leverage: 10
        },

        {
            pOracle: 101,
            price: 101,
            size: -0.1,
            leverage: 10
        },
        {
            pOracle: 104,
            price: 104,
            size: -0.1,
            leverage: 10
        },
        {
            pOracle: 120,
            price: 120,
            size: -0.1,
            leverage: 10,
            expectError: 404
        },
        {
            pOracle: 103,
            price: 103,
            size: -0.1,
            leverage: 10
        }
    ],
    "Test # 5 - Case III: Short position, Short Order = Error on 3rd error": [
        {
            pOracle: 100,
            price: 100,
            size: -100,
            leverage: 10
        },

        {
            pOracle: 103,
            price: 103,
            size: -0.1,
            leverage: 10
        },
        {
            pOracle: 104,
            price: 104,
            size: -0.1,
            leverage: 10
        },
        {
            pOracle: 120,
            price: 120,
            size: -0.1,
            leverage: 10,
            expectError: 404
        },
        {
            pOracle: 101,
            price: 101,
            size: -0.1,
            leverage: 10
        }
    ],
    "Test # 5 - Case IV: Short position, Short Order = Error: `404`": [
        {
            pOracle: 100,
            price: 100,
            size: -100,
            leverage: 10
        },

        {
            pOracle: 104,
            price: 120,
            size: -0.1,
            leverage: 10
        },
        {
            pOracle: 103,
            price: 103,
            size: -0.1,
            leverage: 10
        },
        {
            pOracle: 101,
            price: 101,
            size: -0.1,
            leverage: 10
        },
        {
            pOracle: 120,
            price: 120,
            size: -0.1,
            leverage: 10,
            expectError: 404
        }
    ],
    "Test # 6 - Case I: Short position, Short Order = Error on 3rd error": [
        {
            pOracle: 100,
            price: 100,
            size: -50,
            leverage: 2
        },

        {
            pOracle: 105,
            price: 105,
            size: -0.1,
            leverage: 2
        },
        {
            pOracle: 110,
            price: 110,
            size: -0.1,
            leverage: 2
        },
        {
            pOracle: 200,
            price: 200,
            size: -0.1,
            leverage: 2,
            expectError: 404
        },
        {
            pOracle: 120,
            price: 120,
            size: -0.1,
            leverage: 2
        }
    ],
    "Test # 6 - Case II: Short position, Short Order = Error on 3rd error": [
        {
            pOracle: 100,
            price: 100,
            size: -50,
            leverage: 2
        },

        {
            pOracle: 110,
            price: 110,
            size: -0.1,
            leverage: 2
        },
        {
            pOracle: 120,
            price: 120,
            size: -0.1,
            leverage: 2
        },
        {
            pOracle: 200,
            price: 200,
            size: -0.1,
            leverage: 2,
            expectError: 404
        },
        {
            pOracle: 105,
            price: 105,
            size: -0.1,
            leverage: 2
        }
    ],
    "Test # 6 - Case III: Short position, Short Order = Error on 3rd error": [
        {
            pOracle: 100,
            price: 100,
            size: -50,
            leverage: 2
        },

        {
            pOracle: 105,
            price: 105,
            size: -0.1,
            leverage: 2
        },
        {
            pOracle: 120,
            price: 120,
            size: -0.1,
            leverage: 2
        },
        {
            pOracle: 200,
            price: 200,
            size: -0.1,
            leverage: 2,
            expectError: 404
        },
        {
            pOracle: 110,
            price: 110,
            size: -0.1,
            leverage: 2
        }
    ],
    "Test # 6 - Case IV: Short position, Short Order = Error: `404`": [
        {
            pOracle: 100,
            price: 100,
            size: -50,
            leverage: 2
        },

        {
            pOracle: 105,
            price: 105,
            size: -0.1,
            leverage: 2
        },
        {
            pOracle: 110,
            price: 110,
            size: -0.1,
            leverage: 2
        },
        {
            pOracle: 120,
            price: 120,
            size: -0.1,
            leverage: 2
        },
        {
            pOracle: 200,
            price: 200,
            size: -0.1,
            leverage: 2,
            expectError: 404
        }
    ],
    "Test # 7 - Case V: No position, Long Order = Error: `404`": [
        //taking only same side orders in order of execution
        {
            pOracle: 100,
            price: 100,
            size: 50,
            leverage: 5
        },
        {
            pOracle: 97,
            price: 97,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 90,
            price: 90,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 88,
            price: 88,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 70,
            price: 70,
            size: 0.1,
            leverage: 5,
            expectError: 404
        }
    ],
    "Test # 8 - Case VII: No position, Long and Short Order = Error: `404`": [
        //taking only same side orders in order of execution
        {
            pOracle: 100,
            price: 100,
            size: 50,
            leverage: 5
        },
        {
            pOracle: 97,
            price: 97,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 90,
            price: 90,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 88,
            price: 88,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 70,
            price: 70,
            size: 0.1,
            leverage: 5,
            expectError: 404
        }
    ],
    "Test # 9 - Case V: No position, Short Order = Error: `404`": [
        //taking only same side orders in order of execution
        {
            pOracle: 100,
            price: 100,
            size: -50,
            leverage: 5
        },
        {
            pOracle: 103,
            price: 103,
            size: -0.1,
            leverage: 5
        },
        {
            pOracle: 110,
            price: 110,
            size: -0.1,
            leverage: 5
        },
        {
            pOracle: 112,
            price: 112,
            size: -0.1,
            leverage: 5
        },
        {
            pOracle: 130,
            price: 130,
            size: -0.1,
            leverage: 5,
            expectError: 404
        }
    ],
    "Test # 10 - Case VII: No position, Long and Short Order = Error: `404`": [
        //taking only same side orders in order of execution
        {
            pOracle: 100,
            price: 100,
            size: -50,
            leverage: 5
        },
        {
            pOracle: 103,
            price: 103,
            size: -0.1,
            leverage: 5
        },
        {
            pOracle: 110,
            price: 110,
            size: -0.1,
            leverage: 5
        },
        {
            pOracle: 112,
            price: 112,
            size: -0.1,
            leverage: 5
        },
        {
            pOracle: 130,
            price: 130,
            size: -0.1,
            leverage: 5,
            expectError: 404
        }
    ],
    "Test # A - Case IV: Long position, Long and Short Order = Error: `404`": [
        {
            pOracle: 100,
            price: 100,
            size: 100,
            leverage: 5
        },

        {
            pOracle: 97,
            price: 97,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 90,
            price: 90,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 88,
            price: 88,
            size: 0.1,
            leverage: 5
        },
        {
            pOracle: 40,
            price: 40,
            size: 0.1,
            leverage: 5,
            expectError: 404
        }
    ],
    "Test # B - Case IV: Long position, Long and Short Order = Error: `Cannot trade when loss exceeds margin. Please add margin`":
        [
            {
                pOracle: 100,
                price: 100,
                size: 100,
                leverage: 5
            },

            {
                pOracle: 97,
                price: 97,
                size: 0.1,
                leverage: 5
            },
            {
                pOracle: 90,
                price: 90,
                size: 0.1,
                leverage: 5
            },
            {
                pOracle: 88,
                price: 88,
                size: 0.1,
                leverage: 5
            },
            {
                pOracle: 40,
                price: 40,
                size: -0.1,
                leverage: 5,
                expectError: 46
            }
        ]
};

describe("Margin Ratio", () => {
    const marketConfig: MarketDetails = {
        makerFee: toBigNumberStr(0.02),
        takerFee: toBigNumberStr(0.05),
        mtbLong: toBigNumberStr(1),
        mtbShort: toBigNumberStr(0.99),
        initialMarginRequired: toBigNumberStr(0.0625),
        maintenanceMarginRequired: toBigNumberStr(0.05),
        tickSize: toBigNumberStr(0.0000001),
        maxAllowedPriceDiffInOP: toBigNumberStr(100)
    };
    executeTests(mrTests, marketConfig, { traders: 200_000 });
});
