import { toBigNumberStr } from "../src/library";
import { executeTests } from "./helpers/executor";
import { MarketDetails } from "../src";
import { TestCaseJSON } from "./helpers/interfaces";

// all tests are for taker
const adjustMargin: TestCaseJSON = {
    "Test # 1 - Long Position Add Margin + [MR > IMR] + Proceed": [
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
                pPos: 100,
                bankBalance: 1700
            }
        },
        {
            pOracle: 85,
            addMargin: 100,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 350,
                marginRatio: 0.235294,
                pPos: 100,
                bankBalance: 1600
            }
        }
    ],
    "Test # 2 - Long Position Remove Margin  + [MR > IMR] + Proceed": [
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
                pPos: 100,
                bankBalance: 1700
            }
        },
        {
            pOracle: 120,
            removeMargin: 100,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 150,
                marginRatio: 0.291667,
                pPos: 100,
                bankBalance: 1800
            }
        }
    ],
    "Test # 3 - Short Position Add Margin + [MR > IMR] + Proceed": [
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
                pPos: 100,
                bankBalance: 1700
            }
        },
        {
            pOracle: 102,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.22549,
                pPos: 100,
                bankBalance: 1700
            }
        },
        {
            pOracle: 102,
            addMargin: 100,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 350,
                marginRatio: 0.323529,
                pPos: 100,
                bankBalance: 1600
            }
        }
    ],
    "Test # 4 - Short Position Remove Margin  + [MR > IMR] + Proceed": [
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
                pPos: 100,
                bankBalance: 1700
            }
        },
        {
            pOracle: 80,
            removeMargin: 100,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 150,
                marginRatio: 0.4375,
                pPos: 100,
                bankBalance: 1800
            }
        }
    ],
    "Test # 5 - Long Position Add Margin + [MR < MMR (MR Improves)] + Proceed":
        [
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
                    pPos: 100,
                    bankBalance: 1700
                }
            },
            {
                pOracle: 73.60673,
                addMargin: 50,
                expectTaker: {
                    mro: 0.25,
                    oiOpen: 1000,
                    qPos: 10,
                    margin: 300,
                    marginRatio: 0.049,
                    pPos: 100,
                    bankBalance: 1650
                }
            }
        ],
    "Test # 6 - Short Position Add Margin + [MR < MMR (MR Improves)] + Proceed":
        [
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
                    pPos: 100,
                    bankBalance: 1700
                }
            },
            {
                pOracle: 123.92755,
                addMargin: 50,
                expectTaker: {
                    mro: 0.25,
                    oiOpen: 1000,
                    qPos: -10,
                    margin: 300,
                    marginRatio: 0.049,
                    pPos: 100,
                    bankBalance: 1650
                }
            }
        ],
    "Test # 7 - Long Position Remove Margin  + [MR < MMR (MR falls)] + Error": [
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
                pPos: 100,
                bankBalance: 1700
            }
        },
        {
            pOracle: 77.381443,
            removeMargin: 20,
            expectError: 503
        }
    ],
    "Test # 8 - Short Position Remove Margin  + [MR < MMR (MR falls)] + Error":
        [
            {
                pOracle: 64,
                price: 64,
                size: 10,
                leverage: 4,
                expectTaker: {
                    mro: 0.25,
                    oiOpen: 640,
                    qPos: -10,
                    margin: 160,
                    marginRatio: 0.25,
                    pPos: 64,
                    bankBalance: 1808
                }
            },

            {
                pOracle: 76.213592,
                removeMargin: 15,
                expectError: 503
            }
        ],
    "Test # 9 - Long Position Add Margin + [IMR > MR ≥ MMR (MR Improves)] + Proceed":
        [
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
                    pPos: 100,
                    bankBalance: 1700
                }
            },

            {
                pOracle: 76.638478,
                addMargin: 25,
                expectTaker: {
                    mro: 0.25,
                    oiOpen: 1000,
                    qPos: 10,
                    margin: 275,
                    marginRatio: 0.054,
                    pPos: 100,
                    bankBalance: 1675
                }
            }
        ],

    "Test # 10 - Short Position Add Margin + [IMR > MR ≥ MMR (MR Improves)] + Proceed":
        [
            {
                pOracle: 126,
                price: 126,
                size: 10,
                leverage: 4,
                expectTaker: {
                    mro: 0.25,
                    oiOpen: 1260,
                    qPos: -10,
                    margin: 315,
                    marginRatio: 0.25,
                    pPos: 126,
                    bankBalance: 1622
                }
            },

            {
                pOracle: 151.802657,
                addMargin: 25,
                expectTaker: {
                    mro: 0.25,
                    oiOpen: 1260,
                    qPos: -10,
                    margin: 340,
                    marginRatio: 0.054,
                    pPos: 126,
                    bankBalance: 1597
                }
            }
        ],
    "Test # 11 - Long Position Remove Margin  + [IMR > MR ≥ MMR (MR Falls)] + Error":
        [
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
                    pPos: 100,
                    bankBalance: 1700
                }
            },

            {
                pOracle: 79.598309,
                removeMargin: 3,
                expectError: 503
            }
        ],
    "Test # 12 - Short Position Remove Margin  + [IMR > MR ≥ MMR (MR Falls)] + Error":
        [
            {
                pOracle: 153,
                price: 153,
                size: 10,
                leverage: 4,
                expectTaker: {
                    mro: 0.25,
                    oiOpen: 1530,
                    qPos: -10,
                    margin: 382.5,
                    marginRatio: 0.25,
                    pPos: 153,
                    bankBalance: 1541
                }
            },

            {
                pOracle: 180.502846,
                removeMargin: 10,
                expectError: 503
            }
        ],
    "Test # 13 - Long Position + Add more than Bank + [Cannot add more than bank] + Error":
        [
            {
                pOracle: 101,
                price: 100,
                size: -10,
                leverage: 4,
                expectTaker: {
                    mro: 0.25,
                    oiOpen: 1000,
                    qPos: 10,
                    margin: 250,
                    marginRatio: 0.257426,
                    pPos: 100,
                    bankBalance: 1700
                }
            },

            {
                pOracle: 101,
                addMargin: 2200,
                expectError: 600
            }
        ],
    "Test # 14 - Short Position + Add more than Bank + [Cannot add more than bank] + Error":
        [
            {
                pOracle: 101,
                price: 100,
                size: 10,
                leverage: 4,
                expectTaker: {
                    mro: 0.25,
                    oiOpen: 1000,
                    qPos: -10,
                    margin: 250,
                    marginRatio: 0.237624,
                    pPos: 100,
                    bankBalance: 1700
                }
            },

            {
                pOracle: 101,
                addMargin: 2200,
                expectError: 600
            }
        ],
    "Test # 15 - Long Position + Remove more than Margin + [P16] + Error": [
        {
            pOracle: 101,
            price: 100,
            size: -10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.257426,
                pPos: 100,
                bankBalance: 1700
            }
        },

        {
            pOracle: 101,
            removeMargin: 270,
            expectError: 503
        }
    ],

    "Test # 16 - Short Position + Remove more than Margin + [P16] + Error": [
        {
            pOracle: 101,
            price: 100,
            size: 10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.237624,
                pPos: 100,
                bankBalance: 1700
            }
        },

        {
            pOracle: 101,
            removeMargin: 270,
            expectError: 503
        }
    ],
    "Test # 17 - Long Position + Remove more than MRO + [P16] + Error": [
        {
            pOracle: 101,
            price: 100,
            size: -10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.257426,
                pPos: 100,
                bankBalance: 1700
            }
        },

        {
            pOracle: 101,
            removeMargin: 20,
            expectError: 503
        }
    ],
    "Test # 18 - Short Position + Remove more than MRO + [P16] + Error": [
        {
            pOracle: 101,
            price: 100,
            size: 10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.237624,
                pPos: 100,
                bankBalance: 1700
            }
        },

        {
            pOracle: 101,
            removeMargin: 20,
            expectError: 503
        }
    ],

    "Test # 23 - Long Position + Adding 0 Margin + [] + Error": [
        {
            pOracle: 101,
            price: 100,
            size: -10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.257426,
                pPos: 100,
                bankBalance: 1700
            }
        },

        {
            pOracle: 101,
            addMargin: 0,
            expectError: 500
        }
    ],
    "Test # 24 - Short Position + Adding 0 Margin + [] + Error": [
        {
            pOracle: 101,
            price: 100,
            size: 10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.237624,
                pPos: 100,
                bankBalance: 1700
            }
        },

        {
            pOracle: 101,
            addMargin: 0,
            expectError: 500
        }
    ],
    "Test # 25 - Long Position + Removing 0 Margin + [P15] + Error": [
        {
            pOracle: 101,
            price: 100,
            size: -10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.257426,
                pPos: 100,
                bankBalance: 1700
            }
        },

        {
            pOracle: 101,
            removeMargin: 0,
            expectError: 500
        }
    ],
    "Test # 26 - Short Position + Removing 0 Margin + [P15] + Error": [
        {
            pOracle: 101,
            price: 100,
            size: 10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.237624,
                pPos: 100,
                bankBalance: 1700
            }
        },
        {
            pOracle: 101,
            removeMargin: 0,
            expectError: 500
        }
    ],
    "Test # 27 - Long Position + Add max + [] + Proceed": [
        {
            pOracle: 101,
            price: 100,
            size: -10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.257426,
                pPos: 100,
                bankBalance: 1700
            }
        },
        {
            pOracle: 101,
            addMargin: 50,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 300,
                marginRatio: 0.306931,
                pPos: 100,
                bankBalance: 1650
            }
        },
        {
            pOracle: 101,
            addMargin: 1650,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 1950,
                marginRatio: 1.940594,
                pPos: 100,
                bankBalance: 0
            }
        }
    ],
    "Test # 28 - Short Position + Add max + [] + Proceed": [
        {
            pOracle: 101,
            price: 100,
            size: 10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.237624,
                pPos: 100,
                bankBalance: 1700
            }
        },
        {
            pOracle: 101,
            addMargin: 50,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 300,
                marginRatio: 0.287129,
                pPos: 100,
                bankBalance: 1650
            }
        },
        {
            pOracle: 101,
            addMargin: 1650,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 1950,
                marginRatio: 1.920792,
                pPos: 100,
                bankBalance: 0
            }
        }
    ],
    "Test # 29 - Long Position + Remove Max + [] + Proceed": [
        {
            pOracle: 101,
            price: 100,
            size: -10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.257426,
                pPos: 100,
                bankBalance: 1700
            }
        },
        {
            pOracle: 200,
            removeMargin: 250,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 0,
                marginRatio: 0.5,
                pPos: 100,
                bankBalance: 1950
            }
        }
    ],
    "Test # 30 - Short Position + Remove Max + [] + Proceed": [
        {
            pOracle: 101,
            price: 100,
            size: 10,
            leverage: 4,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.237624,
                pPos: 100,
                bankBalance: 1700
            }
        },
        {
            pOracle: 50,
            removeMargin: 250,
            expectTaker: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 0,
                marginRatio: 1,
                pPos: 100,
                bankBalance: 1950
            }
        }
    ],
    "Test # 31 - Long Position + Remove previously added margin + [] + Proceed":
        [
            {
                pOracle: 101,
                price: 101,
                size: -10,
                leverage: 4,
                expectTaker: {
                    mro: 0.25,
                    oiOpen: 1010,
                    qPos: 10,
                    margin: 252.5,
                    marginRatio: 0.25,
                    pPos: 101,
                    bankBalance: 1697
                }
            },
            {
                pOracle: 101,
                addMargin: 250,
                expectTaker: {
                    mro: 0.25,
                    oiOpen: 1010,
                    qPos: 10,
                    margin: 502.5,
                    marginRatio: 0.497525,
                    pPos: 101,
                    bankBalance: 1447
                }
            },
            {
                pOracle: 101,
                removeMargin: 250,
                expectTaker: {
                    mro: 0.25,
                    oiOpen: 1010,
                    qPos: 10,
                    margin: 252.5,
                    marginRatio: 0.25,
                    pPos: 101,
                    bankBalance: 1697
                }
            }
        ],
    "Test # 32 - Short Position + Remove previously added margin + [] + Proceed":
        [
            {
                pOracle: 101,
                price: 101,
                size: 10,
                leverage: 4,
                expectTaker: {
                    mro: 0.25,
                    oiOpen: 1010,
                    qPos: -10,
                    margin: 252.5,
                    marginRatio: 0.25,
                    pPos: 101,
                    bankBalance: 1697
                }
            },
            {
                pOracle: 101,
                addMargin: 250,
                expectTaker: {
                    mro: 0.25,
                    oiOpen: 1010,
                    qPos: -10,
                    margin: 502.5,
                    marginRatio: 0.497525,
                    pPos: 101,
                    bankBalance: 1447
                }
            },
            {
                pOracle: 101,
                removeMargin: 250,
                expectTaker: {
                    mro: 0.25,
                    oiOpen: 1010,
                    qPos: -10,
                    margin: 252.5,
                    marginRatio: 0.25,
                    pPos: 101,
                    bankBalance: 1697
                }
            }
        ]
};

describe("Adjust Margin", () => {
    const marketConfig: MarketDetails = {
        makerFee: toBigNumberStr(0.05),
        takerFee: toBigNumberStr(0.05),
        initialMarginRequired: toBigNumberStr(0.0625),
        maintenanceMarginRequired: toBigNumberStr(0.05),
        maxAllowedPriceDiffInOP: toBigNumberStr(100)
    };

    executeTests(adjustMargin, marketConfig);
});
