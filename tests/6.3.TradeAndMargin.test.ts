import { MarketDetails } from "../src";
import { toBigNumberStr } from "../src/library";
import { executeTests } from "./helpers/executor";
import { TestCaseJSON } from "./helpers/interfaces";

const marginTestsWithoutFee: TestCaseJSON = {
    "Test # 1 - Long Position + Long Trade (Increasing) + [MR > IMR] + Proceed":
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
                }
            },
            {
                pOracle: 83.333333,
                price: 100,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1600,
                    qPos: 16,
                    margin: 400,
                    marginRatio: 0.1,
                    pPos: 100
                }
            }
        ],
    "Test # 2 - Long Position + Short Trade (Reducing) + [MR > IMR] + Proceed":
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
                }
            },
            {
                pOracle: 83.333333,
                price: 100,
                size: -6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 400,
                    qPos: 4,
                    margin: 100,
                    marginRatio: 0.1,
                    pPos: 100
                }
            }
        ],
    "Test # 3 - Long Position + Short Trade (Closing) + [MR > IMR] + Proceed": [
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
            }
        },
        {
            pOracle: 100,
            price: 100,
            size: -10,
            leverage: 4,
            expectMaker: {
                mro: 0,
                oiOpen: 0,
                qPos: 0,
                margin: 0,
                marginRatio: 1,
                pPos: 0
            }
        }
    ],
    "Test # 4 - Long Position + Short Trade (Flipping) + [MR > IMR] + Proceed":
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
                }
            },
            {
                pOracle: 85.227273,
                price: 75,
                size: -16,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 450,
                    qPos: -6,
                    margin: 112.5,
                    marginRatio: 0.1,
                    pPos: 75
                }
            }
        ],
    "Test # 5 - Short Position + Short Trade (Increasing) + [MR > IMR] + Proceed":
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
                }
            },
            {
                pOracle: 113.636364,
                price: 100,
                size: -6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1600,
                    qPos: -16,
                    margin: 400,
                    marginRatio: 0.1,
                    pPos: 100
                }
            }
        ],
    "Test # 6 - Short Position + Long Trade (Reducing) + [MR > IMR] + Proceed":
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
                }
            },
            {
                pOracle: 113.636364,
                price: 100,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 400,
                    qPos: -4,
                    margin: 100,
                    marginRatio: 0.1,
                    pPos: 100
                }
            }
        ],
    "Test # 7 - Short Position + Long Trade (Closing) + [MR > IMR] + Proceed": [
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
            }
        },
        {
            pOracle: 100,
            price: 100,
            size: 10,
            leverage: 4,
            expectMaker: {
                mro: 0,
                oiOpen: 0,
                qPos: 0,
                margin: 0,
                marginRatio: 1,
                pPos: 0
            }
        }
    ],
    "Test # 9 - Long Position + Long Trade (Increasing) + [MR < MMR (MR Improves)] + Error":
        [
            {
                pOracle: 101,
                price: 101,
                size: 10,
                leverage: 5,
                expectMaker: {
                    mro: 0.2,
                    oiOpen: 1010,
                    qPos: 10,
                    margin: 202,
                    marginRatio: 0.2,
                    pPos: 101
                }
            },
            {
                pOracle: 83.854167,
                price: 100,
                size: 6,
                leverage: 5,
                expectError: 404
            }
        ],
    "Test # 10 - Long Position + Short Trade (Reducing) + [MR < MMR (MR Improves)] + Proceed":
        [
            {
                pOracle: 100,
                price: 100,
                size: 10,
                leverage: 5,
                expectMaker: {
                    mro: 0.2,
                    oiOpen: 1000,
                    qPos: 10,
                    margin: 200,
                    marginRatio: 0.2,
                    pPos: 100
                }
            },
            {
                pOracle: 83.333333,
                price: 100,
                size: -6,
                leverage: 5,
                expectMaker: {
                    mro: 0.2,
                    oiOpen: 400,
                    qPos: 4,
                    margin: 80,
                    marginRatio: 0.04,
                    pPos: 100
                }
            }
        ],
    "Test # 11 - Long Position + Short Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 120,
                price: 120,
                size: 10,
                leverage: 5,
                expectMaker: {
                    mro: 0.2,
                    oiOpen: 1200,
                    qPos: 10,
                    margin: 240,
                    marginRatio: 0.2,
                    pPos: 120
                }
            },
            {
                pOracle: 100,
                price: 100,
                size: -10,
                leverage: 5,
                expectMaker: {
                    mro: 0,
                    oiOpen: 0,
                    qPos: 0,
                    margin: 0,
                    marginRatio: 1,
                    pPos: 0
                }
            }
        ],
    "Test # 13 - Short Position + Short Trade (Increasing) + [MR < MMR (MR Improves)] + Error":
        [
            {
                pOracle: 99,
                price: 99,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 990,
                    qPos: -10,
                    margin: 247.5,
                    marginRatio: 0.25,
                    pPos: 99
                }
            },
            {
                pOracle: 119.441106,
                price: 0,
                size: 0,
                leverage: 0,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 990,
                    qPos: -10,
                    margin: 247.5,
                    marginRatio: 0.036075,
                    pPos: 99
                }
            },
            {
                pOracle: 119.441106,
                price: 100,
                size: -6,
                leverage: 4,
                expectError: 404
            }
        ],
    "Test # 14 - Short Position + Long Trade (Reducing) + [MR < MMR (MR Improves)] + Proceed":
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
                }
            },

            {
                pOracle: 120.192308,
                price: 100,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 400,
                    qPos: -4,
                    margin: 100,
                    marginRatio: 0.04,
                    pPos: 100
                }
            }
        ],
    "Test # 15 - Short Position + Long Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 82,
                price: 82,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 820,
                    qPos: -10,
                    margin: 205,
                    marginRatio: 0.25,
                    pPos: 82
                }
            },

            {
                pOracle: 100,
                price: 100,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0,
                    oiOpen: 0,
                    qPos: 0,
                    margin: 0,
                    marginRatio: 1,
                    pPos: 0
                }
            }
        ],
    "Test # 17 - Long Position + Long Trade (Increasing) + [MR < MMR (MR doesnt change)] + Error":
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
                }
            },

            {
                pOracle: 78.125,
                price: 100,
                size: 6,
                leverage: 4,
                expectError: 404
            }
        ],
    "Test # 18 - Long Position + Short Trade (Reducing) + [MR < MMR (MR doesnt change)] + Proceed":
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
                }
            },

            {
                pOracle: 78.125,
                price: 100,
                size: -6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 400,
                    qPos: 4,
                    margin: 100,
                    marginRatio: 0.04,
                    pPos: 100
                }
            }
        ],
    "Test # 19 - Long Position + Short Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 126,
                price: 126,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1260,
                    qPos: 10,
                    margin: 315,
                    marginRatio: 0.25,
                    pPos: 126
                }
            },

            {
                pOracle: 100,
                price: 100,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0,
                    oiOpen: 0,
                    qPos: 0,
                    margin: 0,
                    marginRatio: 1,
                    pPos: 0
                }
            }
        ],
    "Test # 21 - Short Position + Short Trade (Increasing) + [MR < MMR (MR doesnt change)] + Error":
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
                }
            },

            {
                pOracle: 120.192308,
                price: 100,
                size: -6,
                leverage: 4,
                expectError: 404
            }
        ],
    "Test # 22 - Short Position + Long Trade (Reducing) + [MR < MMR (MR doesnt change)] + Proceed":
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
                }
            },

            {
                pOracle: 120.192308,
                price: 100,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 400,
                    qPos: -4,
                    margin: 100,
                    marginRatio: 0.04,
                    pPos: 100
                }
            }
        ],
    "Test # 23 - Short Position + Long Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 83.2,
                price: 83.2,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 832,
                    qPos: -10,
                    margin: 208,
                    marginRatio: 0.25,
                    pPos: 83.2
                }
            },
            {
                pOracle: 100,
                price: 0,
                size: 0,
                leverage: 0,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 832,
                    qPos: -10,
                    margin: 208,
                    marginRatio: 0.04,
                    pPos: 83.2
                }
            },
            {
                pOracle: 100,
                price: 100,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0,
                    oiOpen: 0,
                    qPos: 0,
                    margin: 0,
                    marginRatio: 1,
                    pPos: 0
                }
            }
        ],
    "Test # 25 - Long Position + Long Trade (Increasing) + [MR < MMR (MR falls)] + Error":
        [
            {
                pOracle: 99,
                price: 99,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 990,
                    qPos: 10,
                    margin: 247.5,
                    marginRatio: 0.25,
                    pPos: 99
                }
            },
            {
                pOracle: 77.636719,
                price: 100,
                size: 6,
                leverage: 4,
                expectError: 402
            }
        ],
    "Test # 27 - Long Position + Short Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 128,
                price: 128,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1280,
                    qPos: 10,
                    margin: 320,
                    marginRatio: 0.25,
                    pPos: 128
                }
            },
            {
                pOracle: 100,
                price: 100,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0,
                    oiOpen: 0,
                    qPos: 0,
                    margin: 0,
                    marginRatio: 1,
                    pPos: 0
                }
            }
        ],
    "Test # 29 - Short Position + Short Trade (Increasing) + [MR < MMR (MR falls)] + Error":
        [
            {
                pOracle: 102.5,
                price: 102.5,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1025,
                    qPos: -10,
                    margin: 256.25,
                    marginRatio: 0.25,
                    pPos: 102.5
                }
            },

            {
                pOracle: 122.070313,
                price: 100,
                size: -6,
                leverage: 4,
                expectError: 402
            }
        ],
    "Test # 31 - Short Position + Long Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 83.5,
                price: 83.5,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 835,
                    qPos: -10,
                    margin: 208.75,
                    marginRatio: 0.25,
                    pPos: 83.5
                }
            },

            {
                pOracle: 100,
                price: 100,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0,
                    oiOpen: 0,
                    qPos: 0,
                    margin: 0,
                    marginRatio: 1,
                    pPos: 0
                }
            }
        ],
    "Test # 33 - Long Position + Long Trade (Increasing) + [IMR > MR >= MMR (MR Improves)] + Proceed":
        [
            {
                pOracle: 101,
                price: 101,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1010,
                    qPos: 10,
                    margin: 252.5,
                    marginRatio: 0.25,
                    pPos: 101
                }
            },

            {
                pOracle: 79.776691,
                price: 100,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1610,
                    qPos: 16,
                    margin: 402.5,
                    marginRatio: 0.054,
                    pPos: 100.625
                }
            }
        ],
    "Test # 34 - Long Position + Short Trade (Reducing) + [IMR > MR >= MMR (MR Improves)] + Proceed":
        [
            {
                pOracle: 101,
                price: 101,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1010,
                    qPos: 10,
                    margin: 252.5,
                    marginRatio: 0.25,
                    pPos: 101
                }
            },
            {
                pOracle: 80.073996,
                price: 0,
                size: 0,
                leverage: 0,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1010,
                    qPos: 10,
                    margin: 252.5,
                    marginRatio: 0.054,
                    pPos: 101
                }
            },
            {
                pOracle: 80.073996,
                price: 100,
                size: -6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 404,
                    qPos: 4,
                    margin: 101,
                    marginRatio: 0.054,
                    pPos: 101
                }
            }
        ],
    "Test # 35 - Long Position + Short Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 125.1,
                price: 125.1,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1251,
                    qPos: 10,
                    margin: 312.75,
                    marginRatio: 0.25,
                    pPos: 125.1
                }
            },

            {
                pOracle: 100,
                price: 100,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0,
                    oiOpen: 0,
                    qPos: 0,
                    margin: 0,
                    marginRatio: 1,
                    pPos: 0
                }
            }
        ],
    "Test # 37 - Short Position + Short Trade (Increasing) + [IMR > MR >= MMR (MR Improves)] + Proceed":
        [
            {
                pOracle: 99,
                price: 99,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 990,
                    qPos: -10,
                    margin: 247.5,
                    marginRatio: 0.25,
                    pPos: 99
                }
            },

            {
                pOracle: 117.854602,
                price: 100,
                size: -6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1590,
                    qPos: -16,
                    margin: 397.5,
                    marginRatio: 0.054,
                    pPos: 99.375
                }
            }
        ],
    "Test # 38 - Short Position + Long Trade (Reducing) + [IMR > MR >= MMR (MR Improves)] + Proceed":
        [
            {
                pOracle: 87,
                price: 87,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 870,
                    qPos: -10,
                    margin: 217.5,
                    marginRatio: 0.25,
                    pPos: 87
                }
            },

            {
                pOracle: 103.178368,
                price: 100,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 348,
                    qPos: -4,
                    margin: 87,
                    marginRatio: 0.054,
                    pPos: 87
                }
            }
        ],
    "Test # 39 - Short Position + Long Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 84,
                price: 84,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 840,
                    qPos: -10,
                    margin: 210,
                    marginRatio: 0.25,
                    pPos: 84
                }
            },

            {
                pOracle: 100,
                price: 100,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0,
                    oiOpen: 0,
                    qPos: 0,
                    margin: 0,
                    marginRatio: 1,
                    pPos: 0
                }
            }
        ],
    "Test # 41 - Long Position + Long Trade (Increasing) + [IMR > MR >= MMR (MR doesnt Change)] + Proceed":
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
                }
            },

            {
                pOracle: 79.281184,
                price: 100,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1600,
                    qPos: 16,
                    margin: 400,
                    marginRatio: 0.054,
                    pPos: 100
                }
            }
        ],
    "Test # 42 - Long Position + Short Trade (Reducing) + [IMR > MR >= MMR (MR doesnt Change)] + Proceed":
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
                }
            },

            {
                pOracle: 79.281184,
                price: 100,
                size: -6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 400,
                    qPos: 4,
                    margin: 100,
                    marginRatio: 0.054,
                    pPos: 100
                }
            }
        ],
    "Test # 43 - Long Position + Short Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 125.1,
                price: 125.1,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1251,
                    qPos: 10,
                    margin: 312.75,
                    marginRatio: 0.25,
                    pPos: 125.1
                }
            },

            {
                pOracle: 100,
                price: 100,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0,
                    oiOpen: 0,
                    qPos: 0,
                    margin: 0,
                    marginRatio: 1,
                    pPos: 0
                }
            }
        ],

    "Test # 45 - Short Position + Short Trade (Increasing) + [IMR > MR >= MMR (MR doesnt Change)] + Proceed":
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
                }
            },

            {
                pOracle: 118.595825,
                price: 100,
                size: -6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1600,
                    qPos: -16,
                    margin: 400,
                    marginRatio: 0.054,
                    pPos: 100
                }
            }
        ],
    "Test # 46 - Short Position + Long Trade (Reducing) + [IMR > MR >= MMR (MR doesnt Change)] + Proceed":
        [
            {
                pOracle: 87,
                price: 87,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 870,
                    qPos: -10,
                    margin: 217.5,
                    marginRatio: 0.25,
                    pPos: 87
                }
            },
            {
                pOracle: 103.178368,
                price: 0,
                size: 0,
                leverage: 0,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 870,
                    qPos: -10,
                    margin: 217.5,
                    marginRatio: 0.054,
                    pPos: 87
                }
            },
            {
                pOracle: 103.178368,
                price: 100,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 348,
                    qPos: -4,
                    margin: 87,
                    marginRatio: 0.054,
                    pPos: 87
                }
            }
        ],
    "Test # 47 - Short Position + Long Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 84,
                price: 84,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 840,
                    qPos: -10,
                    margin: 210,
                    marginRatio: 0.25,
                    pPos: 84
                }
            },

            {
                pOracle: 100,
                price: 100,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0,
                    oiOpen: 0,
                    qPos: 0,
                    margin: 0,
                    marginRatio: 1,
                    pPos: 0
                }
            }
        ],
    "Test # 49 - Long Position + Long Trade (Increasing) + [IMR > MR >= MMR (MR Falls)] + Error":
        [
            {
                pOracle: 97.75,
                price: 97.75,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 977.5,
                    qPos: 10,
                    margin: 244.375,
                    marginRatio: 0.25,
                    pPos: 97.75
                }
            },

            {
                pOracle: 78.166292,
                price: 100,
                size: 6,
                leverage: 4,
                expectError: 402
            }
        ],
    "Test # 50 - Long Position + Short Trade (Reducing) + [IMR > MR >= MMR (MR Falls)] + Proceed":
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
                }
            },

            {
                pOracle: 79.281184,
                price: 100,
                size: -6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 400,
                    qPos: 4,
                    margin: 100,
                    marginRatio: 0.054,
                    pPos: 100
                }
            }
        ],
    "Test # 51 - Long Position + Short Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 125.1,
                price: 125.1,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1251,
                    qPos: 10,
                    margin: 312.75,
                    marginRatio: 0.25,
                    pPos: 125.1
                }
            },

            {
                pOracle: 100,
                price: 100,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0,
                    oiOpen: 0,
                    qPos: 0,
                    margin: 0,
                    marginRatio: 1,
                    pPos: 0
                }
            }
        ],
    "Test # 53 - Short Position + Short Trade (Increasing) + [IMR > MR >= MMR (MR Falls)] + Error":
        [
            {
                pOracle: 102,
                price: 102,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1020,
                    qPos: -10,
                    margin: 255,
                    marginRatio: 0.25,
                    pPos: 102
                }
            },

            {
                pOracle: 120.078273,
                price: 100,
                size: -6,
                leverage: 4,
                expectError: 402
            }
        ],
    "Test # 54 - Short Position + Long Trade (Reducing) + [IMR > MR >= MMR (MR Falls)] + Proceed":
        [
            {
                pOracle: 87,
                price: 87,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 870,
                    qPos: -10,
                    margin: 217.5,
                    marginRatio: 0.25,
                    pPos: 87
                }
            },

            {
                pOracle: 103.178368,
                price: 100,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 348,
                    qPos: -4,
                    margin: 87,
                    marginRatio: 0.054,
                    pPos: 87
                }
            }
        ],
    "Test # 55 - Short Position + Long Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 84,
                price: 84,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 840,
                    qPos: -10,
                    margin: 210,
                    marginRatio: 0.25,
                    pPos: 84
                }
            },
            {
                pOracle: 100,
                price: 100,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0,
                    oiOpen: 0,
                    qPos: 0,
                    margin: 0,
                    marginRatio: 1,
                    pPos: 0
                }
            }
        ]
};

describe("Margin Tests Without Fee", () => {
    const marketConfig: MarketDetails = {
        makerFee: toBigNumberStr(0),
        takerFee: toBigNumberStr(0),
        initialMarginRequired: toBigNumberStr(0.0625),
        maintenanceMarginRequired: toBigNumberStr(0.05),
        tickSize: toBigNumberStr(0.0000001),
        maxAllowedPriceDiffInOP: toBigNumberStr(1000),
        mtbLong: toBigNumberStr(1),
        mtbShort: toBigNumberStr(0.99)
    };
    executeTests(marginTestsWithoutFee, marketConfig);
});

const marginTestsWithFee: TestCaseJSON = {
    "Test # 1 - Long Position + Long Trade (Increasing) + [MR > IMR] + Proceed":
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
                pOracle: 83.333333,
                price: 100,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1600,
                    qPos: 16,
                    margin: 400,
                    marginRatio: 0.1,
                    pPos: 100
                },
                expectSystem: { fee: 112 }
            }
        ],
    "Test # 2 - Long Position + Short Trade (Reducing) + [MR > IMR] + Proceed":
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
                pOracle: 83.333333,
                price: 100,
                size: -6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 400,
                    qPos: 4,
                    margin: 100,
                    marginRatio: 0.1,
                    pPos: 100
                },
                expectSystem: { fee: 154 }
            }
        ],
    "Test # 3 - Long Position + Short Trade (Closing) + [MR > IMR] + Proceed": [
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
            price: 100,
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
            expectSystem: { fee: 210 }
        }
    ],
    "Test # 4 - Long Position + Short Trade (Flipping) + [MR > IMR] + Proceed":
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
                pOracle: 86.363636,
                price: 76,
                size: -16,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 456,
                    qPos: -6,
                    margin: 114,
                    marginRatio: 0.1,
                    pPos: 76
                },
                expectSystem: { fee: 149.92 }
            }
        ],
    "Test # 5 - Short Position + Short Trade (Increasing) + [MR > IMR] + Proceed":
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
                pOracle: 113.636364,
                price: 100,
                size: -6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1600,
                    qPos: -16,
                    margin: 400,
                    marginRatio: 0.1,
                    pPos: 100
                },
                expectSystem: { fee: 112 }
            }
        ],
    "Test # 6 - Short Position + Long Trade (Reducing) + [MR > IMR] + Proceed":
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
                pOracle: 113.636364,
                price: 100,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 400,
                    qPos: -4,
                    margin: 100,
                    marginRatio: 0.1,
                    pPos: 100
                },
                expectSystem: { fee: 154 }
            }
        ],
    "Test # 7 - Short Position + Long Trade (Closing) + [MR > IMR] + Proceed": [
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
            price: 100,
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
            expectSystem: { fee: 210 }
        }
    ],
    "Test # 8 - Short Position + Long Trade (Flipping) + [MR > IMR] + Proceed":
        [
            {
                pOracle: 95,
                price: 95,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 950,
                    qPos: -10,
                    margin: 237.5,
                    marginRatio: 0.25,
                    pPos: 95
                },
                expectSystem: { fee: 66.5 }
            },

            {
                pOracle: 98.333333,
                price: 118,
                size: 16,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 708,
                    qPos: 6,
                    margin: 177,
                    marginRatio: 0.1,
                    pPos: 118
                },
                expectSystem: { fee: 182.56 }
            }
        ],
    "Test # 9 - Long Position + Long Trade (Increasing) + [MR < MMR (MR Improves)] + Error":
        [
            {
                pOracle: 101,
                price: 101,
                size: 10,
                leverage: 5,
                expectMaker: {
                    mro: 0.2,
                    oiOpen: 1010,
                    qPos: 10,
                    margin: 202,
                    marginRatio: 0.2,
                    pPos: 101
                },
                expectSystem: { fee: 70.7 }
            },

            {
                pOracle: 83.854167,
                price: 100,
                size: 6,
                leverage: 5,
                expectError: 404
            }
        ],
    "Test # 11 - Long Position + Short Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 120,
                price: 120,
                size: 10,
                leverage: 5,
                expectMaker: {
                    mro: 0.2,
                    oiOpen: 1200,
                    qPos: 10,
                    margin: 240,
                    marginRatio: 0.2,
                    pPos: 120
                },
                expectSystem: { fee: 84 }
            },

            {
                pOracle: 100,
                price: 100,
                size: -10,
                leverage: 5,
                expectMaker: {
                    mro: 0,
                    oiOpen: 0,
                    qPos: 0,
                    margin: 0,
                    marginRatio: 1,
                    pPos: 0
                },
                expectSystem: { fee: 224 }
            }
        ],
    "Test # 12 - Long Position + Short Trade (Flipping) + [MR < MMR (MR Improves)] + Error":
        [
            {
                pOracle: 140,
                price: 140,
                size: 10,
                leverage: 5,
                expectMaker: {
                    mro: 0.2,
                    oiOpen: 1400,
                    qPos: 10,
                    margin: 280,
                    marginRatio: 0.2,
                    pPos: 140
                },
                expectSystem: { fee: 98 }
            },

            {
                pOracle: 115.384615,
                price: 100,
                size: -16,
                leverage: 5,
                expectError: 46
            }
        ],
    "Test # 13 - Short Position + Short Trade (Increasing) + [MR < MMR (MR Improves)] + Error":
        [
            {
                pOracle: 99,
                price: 99,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 990,
                    qPos: -10,
                    margin: 247.5,
                    marginRatio: 0.25,
                    pPos: 99
                },
                expectSystem: { fee: 69.3 }
            },

            {
                pOracle: 119.441106,
                price: 100,
                size: -6,
                leverage: 4,
                expectError: 404
            }
        ],
    "Test # 15 - Short Position + Long Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 82,
                price: 82,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 820,
                    qPos: -10,
                    margin: 205,
                    marginRatio: 0.25,
                    pPos: 82
                },
                expectSystem: { fee: 57.4 }
            },

            {
                pOracle: 100,
                price: 100,
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
                expectSystem: { fee: 197.4 }
            }
        ],
    "Test # 16 - Short Position + Long Trade (Flipping) + [MR < MMR (MR Improves)] + Error":
        [
            {
                pOracle: 64,
                price: 64,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 640,
                    qPos: -10,
                    margin: 160,
                    marginRatio: 0.25,
                    pPos: 64
                },
                expectSystem: { fee: 44.8 }
            },

            {
                pOracle: 78.125,
                price: 100,
                size: 16,
                leverage: 4,
                expectError: 46
            }
        ],
    "Test # 17 - Long Position + Long Trade (Increasing) + [MR < MMR (MR doesnt change)] + Error":
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
                pOracle: 78.125,
                price: 100,
                size: 6,
                leverage: 4,
                expectError: 404
            }
        ],
    "Test # 18 - Long Position + Short Trade (Reducing) + [MR < MMR (MR doesnt change)] + Proceed":
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
                pOracle: 78.125,
                price: 100,
                size: -6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 400,
                    qPos: 4,
                    margin: 100,
                    marginRatio: 0.04,
                    pPos: 100
                },
                expectSystem: { fee: 154 }
            }
        ],
    "Test # 19 - Long Position + Short Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 126,
                price: 126,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1260,
                    qPos: 10,
                    margin: 315,
                    marginRatio: 0.25,
                    pPos: 126
                },
                expectSystem: { fee: 88.2 }
            },

            {
                pOracle: 100,
                price: 100,
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
                expectSystem: { fee: 228.2 }
            }
        ],
    "Test # 20 - Long Position + Short Trade (Flipping) + [MR < MMR (MR doesnt change)] + Error":
        [
            {
                pOracle: 153.846154,
                price: 153.846154,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1538.461538,
                    qPos: 10,
                    margin: 384.615385,
                    marginRatio: 0.25,
                    pPos: 153.846154
                },
                expectSystem: { fee: 107.692308 }
            },

            {
                pOracle: 120.192308,
                price: 100,
                size: -16,
                leverage: 4,
                expectError: 46
            }
        ],
    "Test # 21 - Short Position + Short Trade (Increasing) + [MR < MMR (MR doesnt change)] + Error":
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
                pOracle: 120.192308,
                price: 100,
                size: -6,
                leverage: 4,
                expectError: 404
            }
        ],
    "Test # 22 - Short Position + Long Trade (Reducing) + [MR < MMR (MR doesnt change)] + Proceed":
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
                pOracle: 120.192308,
                price: 100,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 400,
                    qPos: -4,
                    margin: 100,
                    marginRatio: 0.04,
                    pPos: 100
                },
                expectSystem: { fee: 154 }
            }
        ],
    "Test # 23 - Short Position + Long Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 83.2,
                price: 83.2,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 832,
                    qPos: -10,
                    margin: 208,
                    marginRatio: 0.25,
                    pPos: 83.2
                },
                expectSystem: { fee: 58.24 }
            },

            {
                pOracle: 100,
                price: 100,
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
                expectSystem: { fee: 198.24 }
            }
        ],
    "Test # 24 - Short Position + Long Trade (Flipping) + [MR < MMR (MR doesnt change)] + Error":
        [
            {
                pOracle: 65,
                price: 65,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 650,
                    qPos: -10,
                    margin: 162.5,
                    marginRatio: 0.25,
                    pPos: 65
                },
                expectSystem: { fee: 45.5 }
            },

            {
                pOracle: 78.125,
                price: 100,
                size: 16,
                leverage: 4,
                expectError: 46
            }
        ],
    "Test # 25 - Long Position + Long Trade (Increasing) + [MR < MMR (MR falls)] + Error - P35":
        [
            {
                pOracle: 99,
                price: 99,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 990,
                    qPos: 10,
                    margin: 247.5,
                    marginRatio: 0.25,
                    pPos: 99
                },
                expectSystem: { fee: 69.3 }
            },

            {
                pOracle: 77.636719,
                price: 100,
                size: 6,
                leverage: 4,
                expectError: 402
            }
        ],
    "Test # 27 - Long Position + Short Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 128,
                price: 128,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1280,
                    qPos: 10,
                    margin: 320,
                    marginRatio: 0.25,
                    pPos: 128
                },
                expectSystem: { fee: 89.6 }
            },

            {
                pOracle: 100,
                price: 100,
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
                expectSystem: { fee: 229.6 }
            }
        ],
    "Test # 28 - Long Position + Short Trade (Flipping) + [MR < MMR (MR falls)] + Error - 400":
        [
            {
                pOracle: 153,
                price: 153,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1530,
                    qPos: 10,
                    margin: 382.5,
                    marginRatio: 0.25,
                    pPos: 153
                },
                expectSystem: { fee: 107.1 }
            },

            {
                pOracle: 138.380409,
                price: 115.1325,
                size: -16,
                leverage: 4,
                expectError: 400
            }
        ],
    "Test # 29 - Short Position + Short Trade (Increasing) + [MR < MMR (MR falls)] + Error - P35":
        [
            {
                pOracle: 102.5,
                price: 102.5,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1025,
                    qPos: -10,
                    margin: 256.25,
                    marginRatio: 0.25,
                    pPos: 102.5
                },
                expectSystem: { fee: 71.75 }
            },

            {
                pOracle: 122.070313,
                price: 100,
                size: -6,
                leverage: 4,
                expectError: 402
            }
        ],
    "Test # 31 - Short Position + Long Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 83.5,
                price: 83.5,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 835,
                    qPos: -10,
                    margin: 208.75,
                    marginRatio: 0.25,
                    pPos: 83.5
                },
                expectSystem: { fee: 58.45 }
            },

            {
                pOracle: 100,
                price: 100,
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
                expectSystem: { fee: 198.45 }
            }
        ],
    "Test # 32 - Short Position + Long Trade (Flipping) + [MR < MMR (MR falls)] + Error - 400":
        [
            {
                pOracle: 65.2,
                price: 65.2,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 652,
                    qPos: -10,
                    margin: 163,
                    marginRatio: 0.25,
                    pPos: 65.2
                },
                expectSystem: { fee: 45.64 }
            },

            {
                pOracle: 63.544531,
                price: 81.337,
                size: 16,
                leverage: 4,
                expectError: 400
            }
        ],
    "Test # 33 - Long Position + Long Trade (Increasing) + [IMR > MR ≥ MMR (MR Improves)] + Proceed":
        [
            {
                pOracle: 101,
                price: 101,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1010,
                    qPos: 10,
                    margin: 252.5,
                    marginRatio: 0.25,
                    pPos: 101
                },
                expectSystem: { fee: 70.7 }
            },

            {
                pOracle: 79.776691,
                price: 100,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1610,
                    qPos: 16,
                    margin: 402.5,
                    marginRatio: 0.054,
                    pPos: 100.625
                },
                expectSystem: { fee: 112.7 }
            }
        ],
    "Test # 35 - Long Position + Short Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 125.1,
                price: 125.1,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1251,
                    qPos: 10,
                    margin: 312.75,
                    marginRatio: 0.25,
                    pPos: 125.1
                },
                expectSystem: { fee: 87.57 }
            },

            {
                pOracle: 100,
                price: 100,
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
                expectSystem: { fee: 227.57 }
            }
        ],
    "Test # 36 - Long Position + Short Trade (Flipping) + [IMR > MR ≥ MMR (MR Improves)] + Error":
        [
            {
                pOracle: 150,
                price: 150,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1500,
                    qPos: 10,
                    margin: 375,
                    marginRatio: 0.25,
                    pPos: 150
                },
                expectSystem: { fee: 105 }
            },

            {
                pOracle: 118.595825,
                price: 100,
                size: -16,
                leverage: 4,
                expectError: 46
            }
        ],
    "Test # 37 - Short Position + Short Trade (Increasing) + [IMR > MR ≥ MMR (MR Improves)] + Proceed":
        [
            {
                pOracle: 99,
                price: 99,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 990,
                    qPos: -10,
                    margin: 247.5,
                    marginRatio: 0.25,
                    pPos: 99
                },
                expectSystem: { fee: 69.3 }
            },

            {
                pOracle: 117.854602,
                price: 100,
                size: -6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1590,
                    qPos: -16,
                    margin: 397.5,
                    marginRatio: 0.054,
                    pPos: 99.375
                },
                expectSystem: { fee: 111.3 }
            }
        ],
    "Test # 39 - Short Position + Long Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 84,
                price: 84,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 840,
                    qPos: -10,
                    margin: 210,
                    marginRatio: 0.25,
                    pPos: 84
                },
                expectSystem: { fee: 58.8 }
            },

            {
                pOracle: 100,
                price: 100,
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
                expectSystem: { fee: 198.8 }
            }
        ],
    "Test # 40 - Short Position + Long Trade (Flipping) + [IMR > MR ≥ MMR (MR Improves)] + Error":
        [
            {
                pOracle: 66.75,
                price: 66.75,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 667.5,
                    qPos: -10,
                    margin: 166.875,
                    marginRatio: 0.25,
                    pPos: 66.75
                },
                expectSystem: { fee: 46.725 }
            },
            {
                pOracle: 79.281184,
                price: 100,
                size: 16,
                leverage: 4,
                expectError: 46
            }
        ],
    "Test # 41 - Long Position + Long Trade (Increasing) + [IMR > MR ≥ MMR (MR doesnt Change)] + Proceed":
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
                pOracle: 79.281184,
                price: 100,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1600,
                    qPos: 16,
                    margin: 400,
                    marginRatio: 0.054,
                    pPos: 100
                },
                expectSystem: { fee: 112 }
            }
        ],
    "Test # 42 - Long Position + Short Trade (Reducing) + [IMR > MR ≥ MMR (MR doesnt Change)] + Proceed":
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
                pOracle: 79.281184,
                price: 100,
                size: -6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 400,
                    qPos: 4,
                    margin: 100,
                    marginRatio: 0.054,
                    pPos: 100
                },
                expectSystem: { fee: 154 }
            }
        ],
    "Test # 43 - Long Position + Short Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 125.1,
                price: 125.1,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1251,
                    qPos: 10,
                    margin: 312.75,
                    marginRatio: 0.25,
                    pPos: 125.1
                },
                expectSystem: { fee: 87.57 }
            },

            {
                pOracle: 100,
                price: 100,
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
                expectSystem: { fee: 227.57 }
            }
        ],
    "Test # 44 - Long Position + Short Trade (Flipping) + [IMR > MR ≥ MMR (MR doesnt Change)] + Error":
        [
            {
                pOracle: 149.588868,
                price: 149.588868,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1495.888678,
                    qPos: 10,
                    margin: 373.97217,
                    marginRatio: 0.25,
                    pPos: 149.588868
                },
                expectSystem: { fee: 104.712207 }
            },

            {
                pOracle: 118.595825,
                price: 100,
                size: -16,
                leverage: 4,
                expectError: 46
            }
        ],
    "Test # 45 - Short Position + Short Trade (Increasing) + [IMR > MR ≥ MMR (MR doesnt Change)] + Proceed":
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
                pOracle: 118.595825,
                price: 100,
                size: -6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1600,
                    qPos: -16,
                    margin: 400,
                    marginRatio: 0.054,
                    pPos: 100
                },
                expectSystem: { fee: 112 }
            }
        ],
    "Test # 46 - Short Position + Long Trade (Reducing) + [IMR > MR ≥ MMR (MR doesnt Change)] + Proceed":
        [
            {
                pOracle: 87,
                price: 87,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 870,
                    qPos: -10,
                    margin: 217.5,
                    marginRatio: 0.25,
                    pPos: 87
                },
                expectSystem: { fee: 60.9 }
            },

            {
                pOracle: 103.178368,
                price: 100,
                size: 6,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 348,
                    qPos: -4,
                    margin: 87,
                    marginRatio: 0.054,
                    pPos: 87
                },
                expectSystem: { fee: 144.9 }
            }
        ],
    "Test # 47 - Short Position + Long Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 84,
                price: 84,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 840,
                    qPos: -10,
                    margin: 210,
                    marginRatio: 0.25,
                    pPos: 84
                },
                expectSystem: { fee: 58.8 }
            },

            {
                pOracle: 100,
                price: 100,
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
                expectSystem: { fee: 198.8 }
            }
        ],
    "Test # 48 - Short Position + Long Trade (Flipping) + [IMR > MR ≥ MMR (MR doesnt Change)] + Error":
        [
            {
                pOracle: 66.849894,
                price: 66.849894,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 668.498943,
                    qPos: -10,
                    margin: 167.124736,
                    marginRatio: 0.25,
                    pPos: 66.849894
                },
                expectSystem: { fee: 46.794926 }
            },

            {
                pOracle: 79.281184,
                price: 100,
                size: 16,
                leverage: 4,
                expectError: 46
            }
        ],
    "Test # 49 - Long Position + Long Trade (Increasing) + [IMR > MR ≥ MMR (MR Falls)] + Error - P35":
        [
            {
                pOracle: 97.75,
                price: 97.75,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 977.5,
                    qPos: 10,
                    margin: 244.375,
                    marginRatio: 0.25,
                    pPos: 97.75
                },
                expectSystem: { fee: 68.425 }
            },

            {
                pOracle: 78.166292,
                price: 100,
                size: 6,
                leverage: 4,
                expectError: 402
            }
        ],
    "Test # 51 - Long Position + Short Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 125.1,
                price: 125.1,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1251,
                    qPos: 10,
                    margin: 312.75,
                    marginRatio: 0.25,
                    pPos: 125.1
                },
                expectSystem: { fee: 87.57 }
            },

            {
                pOracle: 100,
                price: 100,
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
                expectSystem: { fee: 227.57 }
            }
        ],
    "Test # 52 - Long Position + Short Trade (Flipping) + [IMR > MR ≥ MMR (MR Falls)] + Error - 400":
        [
            {
                pOracle: 149,
                price: 149,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1490,
                    qPos: 10,
                    margin: 372.5,
                    marginRatio: 0.25,
                    pPos: 149
                },
                expectSystem: { fee: 104.3 }
            },

            {
                pOracle: 132.972604,
                price: 112.1225,
                size: -16,
                leverage: 4,
                expectError: 400
            }
        ],
    "Test # 53 - Short Position + Short Trade (Increasing) + [IMR > MR ≥ MMR (MR Falls)] + Error - P35":
        [
            {
                pOracle: 102,
                price: 102,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1020,
                    qPos: -10,
                    margin: 255,
                    marginRatio: 0.25,
                    pPos: 102
                },
                expectSystem: { fee: 71.4 }
            },

            {
                pOracle: 111.778196,
                price: 81.337,
                size: -6,
                leverage: 4,
                expectError: 402
            }
        ],
    "Test # 55 - Short Position + Long Trade (Closing) + [Closing (MR = 100%)] + Proceed":
        [
            {
                pOracle: 84,
                price: 84,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 840,
                    qPos: -10,
                    margin: 210,
                    marginRatio: 0.25,
                    pPos: 84
                },
                expectSystem: { fee: 58.8 }
            },

            {
                pOracle: 100,
                price: 100,
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
                expectSystem: { fee: 198.8 }
            }
        ],
    "Test # 56 - Short Position + Long Trade (Flipping) + [IMR > MR ≥ MMR (MR Falls)] + Error - 400":
        [
            {
                pOracle: 67,
                price: 67,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 670,
                    qPos: -10,
                    margin: 167.5,
                    marginRatio: 0.25,
                    pPos: 67
                },
                expectSystem: { fee: 46.9 }
            },

            {
                pOracle: 66.265196,
                price: 83.5825,
                size: 16,
                leverage: 4,
                expectError: 400
            }
        ],
    "Test # 57 - Long Position + Long Trade (Increasing) + [MR < 0] + Error": [
        {
            pOracle: 97.75,
            price: 97.75,
            size: 10,
            leverage: 4,
            expectMaker: {
                mro: 0.25,
                oiOpen: 977.5,
                qPos: 10,
                margin: 244.375,
                marginRatio: 0.25,
                pPos: 97.75
            },
            expectSystem: { fee: 68.425 }
        },

        {
            pOracle: 57.75,
            price: 74.534375,
            size: 6,
            leverage: 4,
            expectError: 404
        }
    ],
    "Test # 58 - Long Position + Short Trade (Reducing) + [MR < 0] + Error - P37":
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
                pOracle: 60,
                price: 76.25,
                size: -6,
                leverage: 4,
                expectError: 406
            }
        ],
    "Test # 59 - Long Position + Short Trade (Closing w Loss <= Margin) + [MR < 0] + Proceed":
        [
            {
                pOracle: 125.1,
                price: 125.1,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1251,
                    qPos: 10,
                    margin: 312.75,
                    marginRatio: 0.25,
                    pPos: 125.1
                },
                expectSystem: { fee: 87.57 }
            },

            {
                pOracle: 85.1,
                price: 94.13775,
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
                expectSystem: { fee: 203.6628 }
            }
        ],
    "Test # 60 - Long Position + Short Trade (Closing w Loss > Margin) + [MR < 0] + Error":
        [
            {
                pOracle: 125.1,
                price: 125.1,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1251,
                    qPos: 10,
                    margin: 312.75,
                    marginRatio: 0.25,
                    pPos: 125.1
                },
                expectSystem: { fee: 87.57 }
            },

            {
                pOracle: 85.1,
                price: 92.26125,
                size: -10,
                leverage: 4,
                expectError: 46
            }
        ],
    "Test # 61 - Long Position + Short Trade (Flipping w Loss <= Margin) + [MR < 0] + Proceed":
        [
            {
                pOracle: 149,
                price: 149,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1490,
                    qPos: 10,
                    margin: 372.5,
                    marginRatio: 0.25,
                    pPos: 149
                },
                expectSystem: { fee: 104.3 }
            },

            {
                pOracle: 109,
                price: 112.1225,
                size: -16,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 672.735,
                    qPos: -6,
                    margin: 168.18375,
                    marginRatio: 0.285808,
                    pPos: 112.1225
                },
                expectSystem: { fee: 211.1777 }
            }
        ],
    "Test # 62 - Long Position + Short Trade (Flipping w Loss > Margin) + [MR < 0] + Error":
        [
            {
                pOracle: 149,
                price: 149,
                size: 10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1490,
                    qPos: 10,
                    margin: 372.5,
                    marginRatio: 0.25,
                    pPos: 149
                },
                expectSystem: { fee: 104.3 }
            },
            {
                pOracle: 109,
                price: 109.8875,
                size: -16,
                leverage: 4,
                expectError: 46
            }
        ],
    "Test # 63 - Short Position + Short Trade (Increasing) + [MR < 0] + Error - P35":
        [
            {
                pOracle: 102,
                price: 102,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 1020,
                    qPos: -10,
                    margin: 255,
                    marginRatio: 0.25,
                    pPos: 102
                },
                expectSystem: { fee: 71.4 }
            },

            {
                pOracle: 142,
                price: 100,
                size: -6,
                leverage: 4,
                expectError: 402
            }
        ],
    "Test # 64 - Short Position + Long Trade (Reducing) + [MR < 0] + Error - P37":
        [
            {
                pOracle: 87,
                price: 87,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 870,
                    qPos: -10,
                    margin: 217.5,
                    marginRatio: 0.25,
                    pPos: 87
                },
                expectSystem: { fee: 60.9 }
            },

            {
                pOracle: 127,
                price: 100,
                size: 6,
                leverage: 4,
                expectError: 406
            }
        ],
    "Test # 65 - Short Position + Long Trade (Closing w Loss <= Margin) + [MR < 0] + Proceed":
        [
            {
                pOracle: 84,
                price: 84,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 840,
                    qPos: -10,
                    margin: 210,
                    marginRatio: 0.25,
                    pPos: 84
                },
                expectSystem: { fee: 58.8 }
            },

            {
                pOracle: 124,
                price: 104.79,
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
                expectSystem: { fee: 186.648 }
            }
        ],
    "Test # 66 - Short Position + Long Trade (Closing w Loss > Margin) + [MR < 0] + Error":
        [
            {
                pOracle: 84,
                price: 84,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 840,
                    qPos: -10,
                    margin: 210,
                    marginRatio: 0.25,
                    pPos: 84
                },
                expectSystem: { fee: 58.8 }
            },

            {
                pOracle: 124,
                price: 106.05,
                size: 10,
                leverage: 4,
                expectError: 46
            }
        ],
    "Test # 67 - Short Position + Long Trade (Flipping w Loss > Margin) + [MR < 0] + Error":
        [
            {
                pOracle: 67,
                price: 67,
                size: -10,
                leverage: 4,
                expectMaker: {
                    mro: 0.25,
                    oiOpen: 670,
                    qPos: -10,
                    margin: 167.5,
                    marginRatio: 0.25,
                    pPos: 67
                },
                expectSystem: { fee: 46.9 }
            },
            {
                pOracle: 107,
                price: 84.5875,
                size: 16,
                leverage: 4,
                expectError: 46
            }
        ]
};

describe("Margin Tests With Fee", () => {
    const marketConfig: MarketDetails = {
        initialMarginRequired: toBigNumberStr(0.0625),
        maintenanceMarginRequired: toBigNumberStr(0.05),
        tickSize: toBigNumberStr(0.0000001),
        mtbLong: toBigNumberStr(1),
        mtbShort: toBigNumberStr(0.99),
        makerFee: toBigNumberStr(0.02),
        takerFee: toBigNumberStr(0.05),
        maxAllowedPriceDiffInOP: toBigNumberStr(1000)
    };
    executeTests(marginTestsWithFee, marketConfig);
});
