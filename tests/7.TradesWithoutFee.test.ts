import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DeploymentConfig } from "../src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getSignerSUIAddress,
    getSignerFromSeed,
    createOrder
} from "../src/utils";
import { OnChainCalls, OrderSigner, Transaction } from "../src/classes";
import { expectTxToFail, expectTxToSucceed } from "./helpers/expect";
import { ERROR_CODES } from "../src/errors";
import { bigNumber, toBigNumber } from "../src/library";
import {
    getTestAccounts,
    getMakerTakerAccounts,
    MakerTakerAccounts
} from "./helpers/accounts";
import { Trader } from "../src/classes/Trader";
import { network } from "../src/DeploymentConfig";
import { SuiExecuteTransactionResponse } from "@mysten/sui.js";
import { executeTests } from "./helpers/executor";

chai.use(chaiAsPromised);
const expect = chai.expect;
const provider = getProvider(network.rpc, network.faucet);

const tests = {
    "Long Position + Long Trade = Long Position-: -": [
        {
            pOracle: 99,
            price: 100,
            size: 10,
            leverage: 4,
            expect: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.242,
                bankBalance: 1750,
                pPos: 100
            }
        },
        {
            pOracle: 99,
            price: 105,
            size: 4,
            leverage: 4,
            expect: {
                mro: 0.25,
                oiOpen: 1420,
                qPos: 14,
                margin: 355,
                marginRatio: 0.232,
                bankBalance: 1645,
                pPos: 101.429
            }
        }
    ],
    "Short Position + Short Trade = Short Position-: -": [
        {
            pOracle: 99,
            price: 100,
            size: -10,
            leverage: 4,
            expect: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.263,
                bankBalance: 1750,
                pPos: 100
            }
        },
        {
            pOracle: 102,
            price: 105,
            size: -4,
            leverage: 4,
            expect: {
                mro: 0.25,
                oiOpen: 1420,
                qPos: -14,
                margin: 355,
                marginRatio: 0.243,
                bankBalance: 1645,
                pPos: 101.429
            }
        }
    ],
    "Long Position + Short Trade = Long Position-: -user books profit": [
        {
            pOracle: 99,
            price: 100,
            size: 10,
            leverage: 4,
            expect: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.242,
                bankBalance: 1750,
                pPos: 100
            }
        },
        {
            pOracle: 99,
            price: 105,
            size: -4,
            leverage: 4,
            expect: {
                mro: 0.25,
                oiOpen: 600,
                qPos: 6,
                margin: 150,
                marginRatio: 0.242,
                bankBalance: 1870,
                pPos: 100
            }
        }
    ],
    "Long Position + Short Trade = Long Position-: -user books loss": [
        {
            pOracle: 99,
            price: 100,
            size: 10,
            leverage: 4,
            expect: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.242,
                bankBalance: 1750,
                pPos: 100
            }
        },
        {
            pOracle: 101,
            price: 95,
            size: -4,
            leverage: 4,
            expect: {
                mro: 0.25,
                oiOpen: 600,
                qPos: 6,
                margin: 150,
                marginRatio: 0.257,
                bankBalance: 1830,
                pPos: 100
            }
        }
    ],
    "Short Position + Long Trade = Short Position-: -user books profit": [
        {
            pOracle: 100,
            price: 100,
            size: -10,
            leverage: 4,
            expect: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.25,
                bankBalance: 1750,
                pPos: 100
            }
        },
        {
            pOracle: 99,
            price: 95,
            size: 4,
            leverage: 4,
            expect: {
                mro: 0.25,
                oiOpen: 600,
                qPos: -6,
                margin: 150,
                marginRatio: 0.263,
                bankBalance: 1870,
                pPos: 100
            }
        }
    ],
    "Short Position + Long Trade = Short Position-: -user books loss": [
        {
            pOracle: 102,
            price: 100,
            size: -10,
            leverage: 4,
            expect: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: -10,
                margin: 250,
                marginRatio: 0.225,
                bankBalance: 1750,
                pPos: 100
            }
        },
        {
            pOracle: 101,
            price: 105,
            size: 4,
            leverage: 4,
            expect: {
                mro: 0.25,
                oiOpen: 600,
                qPos: -6,
                margin: 150,
                marginRatio: 0.238,
                bankBalance: 1830,
                pPos: 100
            }
        }
    ],
    "Long Position + Short Trade = Short Position-: -Margin is added back to Bank (New Short Value is less than the notional value of Long Value)":
        [
            {
                pOracle: 101,
                price: 100,
                size: 10,
                leverage: 4,
                expect: {
                    mro: 0.25,
                    oiOpen: 1000,
                    qPos: 10,
                    margin: 250,
                    marginRatio: 0.257,
                    bankBalance: 1750,
                    pPos: 100
                }
            },
            {
                pOracle: 99,
                price: 105,
                size: -14,
                leverage: 4,
                expect: {
                    mro: 0.25,
                    oiOpen: 420,
                    qPos: -4,
                    margin: 105,
                    marginRatio: 0.326,
                    bankBalance: 1945,
                    pPos: 105
                }
            }
        ],
    "Long Position + Short Trade = Short Position-: -More Margin is added from Bank to Position (New Short Value is more than the notional value of Long Value)":
        [
            {
                pOracle: 100,
                price: 100,
                size: 10,
                leverage: 4,
                expect: {
                    mro: 0.25,
                    oiOpen: 1000,
                    qPos: 10,
                    margin: 250,
                    marginRatio: 0.25,
                    bankBalance: 1750,
                    pPos: 100
                }
            },
            {
                pOracle: 102,
                price: 105,
                size: -25,
                leverage: 4,
                expect: {
                    mro: 0.25,
                    oiOpen: 1575,
                    qPos: -15,
                    margin: 393.75,
                    marginRatio: 0.287,
                    bankBalance: 1656.25,
                    pPos: 105
                }
            }
        ],
    "Short Position + Long Trade = Long Position-: -Margin is added back to Bank (New Long Value is less than the notional value of Short Value)":
        [
            {
                pOracle: 102,
                price: 100,
                size: -10,
                leverage: 4,
                expect: {
                    mro: 0.25,
                    oiOpen: 1000,
                    qPos: -10,
                    margin: 250,
                    marginRatio: 0.225,
                    bankBalance: 1750,
                    pPos: 100
                }
            },
            {
                pOracle: 101,
                price: 105,
                size: 14,
                leverage: 4,
                expect: {
                    mro: 0.25,
                    oiOpen: 420,
                    qPos: 4,
                    margin: 105,
                    marginRatio: 0.22,
                    bankBalance: 1845,
                    pPos: 105
                }
            }
        ],
    "Short Position + Long Trade = Long Position-: -More Margin is added from Bank to Position (New Long Value is more than the notional value of Short Value)":
        [
            {
                pOracle: 100,
                price: 100,
                size: -10,
                leverage: 4,
                expect: {
                    mro: 0.25,
                    oiOpen: 1000,
                    qPos: -10,
                    margin: 250,
                    marginRatio: 0.25,
                    bankBalance: 1750,
                    pPos: 100
                }
            },
            {
                pOracle: 99,
                price: 105,
                size: 25,
                leverage: 4,
                expect: {
                    mro: 0.25,
                    oiOpen: 1575,
                    qPos: 15,
                    margin: 393.75,
                    marginRatio: 0.205,
                    bankBalance: 1556.25,
                    pPos: 105
                }
            }
        ],

    "Test # 2: Long + Long (Profit) + Long (Loss)-: -": [
        {
            pOracle: 100,
            price: 100,
            size: 10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: 10,
                margin: 200,
                marginRatio: 0.2,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 101,
            price: 105,
            size: 5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1525,
                qPos: 15,
                margin: 305,
                marginRatio: 0.195,
                bankBalance: 1695,
                pPos: 101.667
            }
        },
        {
            pOracle: 102,
            price: 95,
            size: 5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 2000,
                qPos: 20,
                margin: 400,
                marginRatio: 0.216,
                bankBalance: 1600,
                pPos: 100
            }
        }
    ],

    "Test # 3: Long + Long (Loss) + Long (Loss)-: -": [
        {
            pOracle: 99,
            price: 100,
            size: 10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: 10,
                margin: 200,
                marginRatio: 0.192,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 102,
            price: 95,
            size: 5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1475,
                qPos: 15,
                margin: 295,
                marginRatio: 0.229,
                bankBalance: 1705,
                pPos: 98.333
            }
        },
        {
            pOracle: 99,
            price: 90,
            size: 5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1925,
                qPos: 20,
                margin: 385,
                marginRatio: 0.222,
                bankBalance: 1615,
                pPos: 96.25
            }
        }
    ],

    "Test # 4: Long + Long (Loss) + Long (Profit)-: -": [
        {
            pOracle: 99,
            price: 100,
            size: 10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: 10,
                margin: 200,
                marginRatio: 0.192,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 99,
            price: 95,
            size: 5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1475,
                qPos: 15,
                margin: 295,
                marginRatio: 0.205,
                bankBalance: 1705,
                pPos: 98.333
            }
        },
        {
            pOracle: 102,
            price: 110,
            size: 5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 2025,
                qPos: 20,
                margin: 405,
                marginRatio: 0.206,
                bankBalance: 1595,
                pPos: 101.25
            }
        }
    ],

    "Test # 5: Long + Long (Profit) + Short (Profit)-: -": [
        {
            pOracle: 100,
            price: 100,
            size: 10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: 10,
                margin: 200,
                marginRatio: 0.2,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 101,
            price: 105,
            size: 5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1525,
                qPos: 15,
                margin: 305,
                marginRatio: 0.195,
                bankBalance: 1695,
                pPos: 101.667
            }
        },
        {
            pOracle: 101,
            price: 110,
            size: -8,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 711.667,
                qPos: 7,
                margin: 142.333,
                marginRatio: 0.195,
                bankBalance: 1924.333333,
                pPos: 101.667
            }
        }
    ],

    "Test # 6: Long + Long (Profit) + Short (Loss)-: -": [
        {
            pOracle: 99,
            price: 100,
            size: 10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: 10,
                margin: 200,
                marginRatio: 0.192,
                bankBalance: 1800.0,
                pPos: 100
            }
        },
        {
            pOracle: 99,
            price: 105,
            size: 5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1525,
                qPos: 15,
                margin: 305,
                marginRatio: 0.178,
                bankBalance: 1695,
                pPos: 101.667
            }
        },
        {
            pOracle: 99,
            price: 95,
            size: -8,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 711.667,
                qPos: 7,
                margin: 142.333,
                marginRatio: 0.178,
                bankBalance: 1804.333333,
                pPos: 101.667
            }
        }
    ],
    "Test # 7: Long + Long (Loss) + Short (Loss)-: -": [
        {
            pOracle: 100,
            price: 100,
            size: 10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: 10,
                margin: 200,
                marginRatio: 0.2,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 102,
            price: 95,
            size: 5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1475,
                qPos: 15,
                margin: 295,
                marginRatio: 0.229,
                bankBalance: 1705,
                pPos: 98.333
            }
        },
        {
            pOracle: 99,
            price: 90,
            size: -8,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 688.333,
                qPos: 7,
                margin: 137.667,
                marginRatio: 0.205,
                bankBalance: 1795.666667,
                pPos: 98.333
            }
        }
    ],
    "Test # 8: Long + Long (Loss) + Short (Profit)-: -": [
        {
            pOracle: 99,
            price: 100,
            size: 10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: 10,
                margin: 200,
                marginRatio: 0.192,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 100,
            price: 95,
            size: 5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1475,
                qPos: 15,
                margin: 295,
                marginRatio: 0.213,
                bankBalance: 1705,
                pPos: 98.333
            }
        },
        {
            pOracle: 100,
            price: 110,
            size: -8,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 688.333,
                qPos: 7,
                margin: 137.667,
                marginRatio: 0.213,
                bankBalance: 1955.666667,
                pPos: 98.333
            }
        }
    ],
    "Test # 9: Long + Short (Profit) + Short (Profit) (Close)-: -": [
        {
            pOracle: 102,
            price: 100,
            size: 10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: 10,
                margin: 200,
                marginRatio: 0.216,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 99,
            price: 105,
            size: -6,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 400,
                qPos: 4,
                margin: 80,
                marginRatio: 0.192,
                bankBalance: 1950,
                pPos: 100
            }
        },
        {
            pOracle: 101,
            price: 110,
            size: -4,
            leverage: 5,
            expect: {
                mro: 0,
                oiOpen: 0,
                qPos: 0,
                margin: 0,
                marginRatio: 1,
                bankBalance: 2070,
                pPos: 0
            }
        }
    ],
    "Test # 10: Long + Short (Profit) + Short (Loss) (Close)-: -": [
        {
            pOracle: 100,
            price: 100,
            size: 10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: 10,
                margin: 200,
                marginRatio: 0.2,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 100,
            price: 105,
            size: -6,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 400,
                qPos: 4,
                margin: 80,
                marginRatio: 0.2,
                bankBalance: 1950,
                pPos: 100
            }
        },
        {
            pOracle: 102,
            price: 95,
            size: -4,
            leverage: 5,
            expect: {
                mro: 0,
                oiOpen: 0,
                qPos: 0,
                margin: 0,
                marginRatio: 1,
                bankBalance: 2010,
                pPos: 0
            }
        }
    ],
    "Test # 11: Long + Short (Loss) + Short (Loss) (Close)-: -": [
        {
            pOracle: 99,
            price: 100,
            size: 10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: 10,
                margin: 200,
                marginRatio: 0.192,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 102,
            price: 95,
            size: -6,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 400,
                qPos: 4,
                margin: 80,
                marginRatio: 0.216,
                bankBalance: 1890,
                pPos: 100
            }
        },
        {
            pOracle: 101,
            price: 90,
            size: -4,
            leverage: 5,
            expect: {
                mro: 0,
                oiOpen: 0,
                qPos: 0,
                margin: 0,
                marginRatio: 1,
                bankBalance: 1930,
                pPos: 0
            }
        }
    ],
    "Test # 12: Long + Short (Loss) + Short (Profit) (Close)-: -": [
        {
            pOracle: 99,
            price: 100,
            size: 10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: 10,
                margin: 200,
                marginRatio: 0.192,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 102,
            price: 95,
            size: -6,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 400,
                qPos: 4,
                margin: 80,
                marginRatio: 0.216,
                bankBalance: 1890,
                pPos: 100
            }
        },
        {
            pOracle: 99,
            price: 110,
            size: -4,
            leverage: 5,
            expect: {
                mro: 0,
                oiOpen: 0,
                qPos: 0,
                margin: 0,
                marginRatio: 1,
                bankBalance: 2010,
                pPos: 0
            }
        }
    ],
    "Test # 13: Short + Short (Profit) + Short (Profit)-: -": [
        {
            pOracle: 101,
            price: 100,
            size: -10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: -10,
                margin: 200,
                marginRatio: 0.188,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 100,
            price: 95,
            size: -5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1475,
                qPos: -15,
                margin: 295,
                marginRatio: 0.18,
                bankBalance: 1705,
                pPos: 98.333
            }
        },
        {
            pOracle: 100,
            price: 90,
            size: -5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1925,
                qPos: -20,
                margin: 385,
                marginRatio: 0.155,
                bankBalance: 1615,
                pPos: 96.25
            }
        }
    ],
    "Test # 14: Short + Short (Profit) + Short (Loss)-: -": [
        {
            pOracle: 102,
            price: 100,
            size: -10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: -10,
                margin: 200,
                marginRatio: 0.176,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 100,
            price: 95,
            size: -5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1475,
                qPos: -15,
                margin: 295,
                marginRatio: 0.18,
                bankBalance: 1705,
                pPos: 98.333
            }
        },
        {
            pOracle: 99,
            price: 105,
            size: -5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 2000,
                qPos: -20,
                margin: 400,
                marginRatio: 0.212,
                bankBalance: 1600,
                pPos: 100
            }
        }
    ],
    "Test # 15: Short + Short (Loss) + Short (Loss)-: -": [
        {
            pOracle: 101,
            price: 100,
            size: -10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: -10,
                margin: 200,
                marginRatio: 0.188,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 102,
            price: 105,
            size: -5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1525,
                qPos: -15,
                margin: 305,
                marginRatio: 0.196,
                bankBalance: 1695,
                pPos: 101.667
            }
        },
        {
            pOracle: 101,
            price: 110,
            size: -5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 2075,
                qPos: -20,
                margin: 415,
                marginRatio: 0.233,
                bankBalance: 1585,
                pPos: 103.75
            }
        }
    ],
    "Test # 16: Short + Short (Loss) + Short (Profit)-: -": [
        {
            pOracle: 102,
            price: 100,
            size: -10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: -10,
                margin: 200,
                marginRatio: 0.176,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 99,
            price: 105,
            size: -5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1525,
                qPos: -15,
                margin: 305,
                marginRatio: 0.232,
                bankBalance: 1695,
                pPos: 101.667
            }
        },
        {
            pOracle: 101,
            price: 90,
            size: -5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1975,
                qPos: -20,
                margin: 395,
                marginRatio: 0.173,
                bankBalance: 1605,
                pPos: 98.75
            }
        }
    ],
    "Test # 17: Short + Short (Profit) + Long (Profit)-: -": [
        {
            pOracle: 99,
            price: 100,
            size: -10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: -10,
                margin: 200,
                marginRatio: 0.212,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 101,
            price: 95,
            size: -5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1475,
                qPos: -15,
                margin: 295,
                marginRatio: 0.168,
                bankBalance: 1705,
                pPos: 98.333
            }
        },
        {
            pOracle: 102,
            price: 90,
            size: 8,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 688.333,
                qPos: -7,
                margin: 137.667,
                marginRatio: 0.157,
                bankBalance: 1929,
                pPos: 98.333
            }
        }
    ],
    "Test # 18: Short + Short (Profit) + Long (Loss)-: -": [
        {
            pOracle: 99,
            price: 100,
            size: -10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: -10,
                margin: 200,
                marginRatio: 0.212,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 100,
            price: 95,
            size: -5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1475,
                qPos: -15,
                margin: 295,
                marginRatio: 0.18,
                bankBalance: 1705,
                pPos: 98.333
            }
        },
        {
            pOracle: 101,
            price: 105,
            size: 8,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 688.333,
                qPos: -7,
                margin: 137.667,
                marginRatio: 0.168,
                bankBalance: 1809,
                pPos: 98.333
            }
        }
    ],
    "Test # 19: Short + Short (Loss) + Short (Loss)-: -": [
        {
            pOracle: 102,
            price: 100,
            size: -10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: -10,
                margin: 200,
                marginRatio: 0.176,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 101,
            price: 105,
            size: -5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1525,
                qPos: -15,
                margin: 305,
                marginRatio: 0.208,
                bankBalance: 1695,
                pPos: 101.667
            }
        },
        {
            pOracle: 102,
            price: 110,
            size: 8,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 711.667,
                qPos: -7,
                margin: 142.333,
                marginRatio: 0.196,
                bankBalance: 1791,
                pPos: 101.667
            }
        }
    ],
    "Test # 20: Short + Short (Loss) + Short (Profit)-: -": [
        {
            pOracle: 99,
            price: 100,
            size: -10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: -10,
                margin: 200,
                marginRatio: 0.212,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 101,
            price: 105,
            size: -5,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1525,
                qPos: -15,
                margin: 305,
                marginRatio: 0.208,
                bankBalance: 1695,
                pPos: 101.667
            }
        },
        {
            pOracle: 99,
            price: 90,
            size: 8,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 711.667,
                qPos: -7,
                margin: 142.333,
                marginRatio: 0.232,
                bankBalance: 1951,
                pPos: 101.667
            }
        }
    ],
    "Test # 21: Short + Long (Profit) + Long (Profit) (Close)-: -": [
        {
            pOracle: 100,
            price: 100,
            size: -10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: -10,
                margin: 200,
                marginRatio: 0.2,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 102,
            price: 95,
            size: 6,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 400,
                qPos: -4,
                margin: 80,
                marginRatio: 0.176,
                bankBalance: 1950,
                pPos: 100
            }
        },
        {
            pOracle: 99,
            price: 90,
            size: 4,
            leverage: 5,
            expect: {
                mro: 0,
                oiOpen: 0,
                qPos: 0,
                margin: 0,
                marginRatio: 1,
                bankBalance: 2070,
                pPos: 0
            }
        }
    ],
    "Test # 22: Short + Long (Profit) + Long (Loss) (Close)-: -": [
        {
            pOracle: 100,
            price: 100,
            size: -10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: -10,
                margin: 200,
                marginRatio: 0.2,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 101,
            price: 95,
            size: 6,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 400,
                qPos: -4,
                margin: 80,
                marginRatio: 0.188,
                bankBalance: 1950,
                pPos: 100
            }
        },
        {
            pOracle: 99,
            price: 105,
            size: 4,
            leverage: 5,
            expect: {
                mro: 0,
                oiOpen: 0,
                qPos: 0,
                margin: 0,
                marginRatio: 1,
                bankBalance: 2010,
                pPos: 0
            }
        }
    ],
    "Test # 23: Short + Long (Loss) + Long (Loss) (Close)-: -": [
        {
            pOracle: 101,
            price: 100,
            size: -10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: -10,
                margin: 200,
                marginRatio: 0.188,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 102,
            price: 105,
            size: 6,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 400,
                qPos: -4,
                margin: 80,
                marginRatio: 0.176,
                bankBalance: 1890,
                pPos: 100
            }
        },
        {
            pOracle: 101,
            price: 110,
            size: 4,
            leverage: 5,
            expect: {
                mro: 0,
                oiOpen: 0,
                qPos: 0,
                margin: 0,
                marginRatio: 1,
                bankBalance: 1930,
                pPos: 0
            }
        }
    ],
    "Test # 24: Short + Long (Loss) + Long (Profit) (Close)-: -": [
        {
            pOracle: 102,
            price: 100,
            size: -10,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 1000,
                qPos: -10,
                margin: 200,
                marginRatio: 0.176,
                bankBalance: 1800,
                pPos: 100
            }
        },
        {
            pOracle: 100,
            price: 105,
            size: 6,
            leverage: 5,
            expect: {
                mro: 0.2,
                oiOpen: 400,
                qPos: -4,
                margin: 80,
                marginRatio: 0.2,
                bankBalance: 1890,
                pPos: 100
            }
        },
        {
            pOracle: 101,
            price: 90,
            size: 4,
            leverage: 5,
            expect: {
                mro: 0,
                oiOpen: 0,
                qPos: 0,
                margin: 0,
                marginRatio: 1,
                bankBalance: 2010,
                pPos: 0
            }
        }
    ]
};

const singleTest = {
    "Long Position + Long Trade = Long Position-: -": [
        {
            pOracle: 99,
            price: 100,
            size: 10,
            leverage: 4,
            expect: {
                mro: 0.25,
                oiOpen: 1000,
                qPos: 10,
                margin: 250,
                marginRatio: 0.242,
                bankBalance: 1750,
                pPos: 100
            }
        },
        {
            pOracle: 99,
            price: 105,
            size: 4,
            leverage: 4,
            expect: {
                mro: 0.25,
                oiOpen: 1420,
                qPos: 14,
                margin: 355,
                marginRatio: 0.232,
                bankBalance: 1645,
                pPos: 101.429
            }
        }
    ]
};

describe("Trades Without Fee", () => {
    let ownerAddress: string;
    const ownerSigner = getSignerFromSeed(DeploymentConfig.deployer, provider);
    let deployment = readFile(DeploymentConfig.filePath);
    let onChain: OnChainCalls = new OnChainCalls(ownerSigner, deployment);

    before(async () => {
        // ownerAddress = await getSignerSUIAddress(ownerSigner);
        // // make admin operator
        // await onChain.setSettlementOperator(
        //     { operator: ownerAddress, status: true },
        //     ownerSigner
        // );
    });

    executeTests(singleTest);
});
