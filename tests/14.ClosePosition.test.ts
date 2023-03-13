import { Account, getTestAccounts } from "./helpers/accounts";
import { network, DeploymentConfigs } from "../src/DeploymentConfig";
import {
    createMarket,
    createOrder,
    getAddressFromSigner,
    getKeyPairFromSeed,
    getProvider,
    getSignerFromSeed,
    readFile
} from "../src/utils";
import { BASE_DECIMALS, toBigNumber, toBigNumberStr } from "../src/library";
import { OnChainCalls, OrderSigner, Trader, Transaction } from "../src";
import { expect, expectTxToSucceed } from "./helpers/expect";
import { SuiExecuteTransactionResponse } from "@mysten/sui.js";
import { config } from "dotenv";
import { mintAndDeposit } from "./helpers/utils";
import BigNumber from "bignumber.js";
config({ path: ".env" });

const testCases = {
    "Test # 1": [
        {
            action: "trade",
            maker: "A",
            taker: "B",
            pOracle: 1000,
            price: 1000,
            size: 10,
            leverage: 4
        },

        {
            action: "trade",
            maker: "C",
            taker: "D",
            pOracle: 1000,
            price: 1000,
            size: 20,
            leverage: 8
        },

        {
            action: "trade",
            maker: "E",
            taker: "F",
            pOracle: 900,
            price: 900,
            size: 25,
            leverage: 5
        },
        {
            action: "trade",
            maker: "G",
            taker: "H",
            pOracle: 900,
            price: 900,
            size: 20,
            leverage: 4
        },
        {
            action: "price oracle update",
            pOracle: 1200
        },
        {
            action: "remove margin",
            signer: "C",
            pOracle: 1200,
            margin: 2500
        },
        {
            action: "add margin",
            signer: "D",
            pOracle: 1200,
            margin: 3100
        },
        {
            action: "delist market",
            pOracle: 1225
        },
        {
            action: "withdraws",
            signer: "E",
            expect: {
                balance: 13900
            }
        },
        {
            action: "withdraws",
            signer: "G",
            expect: {
                balance: 12320
            }
        },
        {
            action: "withdraws",
            signer: "A",
            expect: {
                balance: 8150
            }
        },
        {
            action: "withdraws",
            signer: "C",
            expect: {
                balance: 6025
            }
        },
        {
            action: "withdraws",
            signer: "B",
            expect: {
                balance: 3300
            }
        },
        {
            action: "withdraws",
            signer: "H",
            expect: {
                balance: 1140
            }
        },
        {
            action: "withdraws",
            signer: "F",
            expect: {
                balance: 1050
            }
        }
    ],
    "Test # 2": [
        {
            action: "trade",
            maker: "A",
            taker: "B",
            pOracle: 1000,
            price: 1000,
            size: -10,
            leverage: 4
        },

        {
            action: "trade",
            maker: "C",
            taker: "D",
            pOracle: 1000,
            price: 1000,
            size: -10,
            leverage: 8
        },

        {
            action: "trade",
            maker: "E",
            taker: "F",
            pOracle: 1100,
            price: 1100,
            size: -25,
            leverage: 6
        },

        {
            action: "trade",
            maker: "G",
            taker: "H",
            pOracle: 1100,
            price: 1100,
            size: -20,
            leverage: 4
        },

        {
            action: "price oracle update",
            pOracle: 850
        },

        {
            action: "remove margin",
            signer: "C",
            pOracle: 850,
            margin: 1250
        },
        {
            action: "add margin",
            signer: "D",
            pOracle: 850,
            margin: 4550
        },
        {
            action: "delist market",
            pOracle: 865
        },

        {
            action: "withdraws",
            signer: "E",
            expect: {
                balance: 11600
            }
        },

        {
            action: "withdraws",
            signer: "G",
            expect: {
                balance: 10480
            }
        },

        {
            action: "withdraws",
            signer: "D",
            expect: {
                balance: 4450
            }
        },

        {
            action: "withdraws",
            signer: "A",
            expect: {
                balance: 7250
            }
        },

        {
            action: "withdraws",
            signer: "C",
            expect: {
                balance: 7250
            }
        },

        {
            action: "withdraws",
            signer: "B",
            expect: {
                balance: 3958.333315
            }
        },

        {
            action: "withdraws",
            signer: "H",
            expect: {
                balance: 60
            }
        },

        {
            action: "withdraws",
            signer: "F",
            expect: {
                balance: 866.666685
            }
        }
    ],
    "Test # 3": [
        {
            action: "trade",
            maker: "A",
            taker: "B",
            pOracle: 1000,
            price: 1000,
            size: -10,
            leverage: 4
        },

        {
            action: "trade",
            maker: "C",
            taker: "D",
            pOracle: 1000,
            price: 1000,
            size: -10,
            leverage: 8
        },

        {
            action: "trade",
            maker: "E",
            taker: "F",
            pOracle: 1100,
            price: 1100,
            size: -25,
            leverage: 6
        },

        {
            action: "trade",
            maker: "G",
            taker: "H",
            pOracle: 1100,
            price: 1100,
            size: -20,
            leverage: 4
        },

        {
            action: "price oracle update",
            pOracle: 850
        },

        {
            action: "remove margin",
            signer: "C",
            pOracle: 850,
            margin: 1250
        },
        {
            action: "add margin",
            signer: "D",
            pOracle: 850,
            margin: 4550
        },
        {
            action: "delist market",
            pOracle: 865
        },

        {
            action: "withdraws",
            signer: "A",
            expect: {
                balance: 7250
            }
        },

        {
            action: "withdraws",
            signer: "B",
            expect: {
                balance: 4450
            }
        },

        {
            action: "withdraws",
            signer: "C",
            expect: {
                balance: 7250
            }
        },

        {
            action: "withdraws",
            signer: "D",
            expect: {
                balance: 4450
            }
        },

        {
            action: "withdraws",
            signer: "E",
            expect: {
                balance: 11600
            }
        },
        {
            action: "withdraws",
            signer: "F",
            expect: {
                balance: 866.666685
            }
        },
        {
            action: "withdraws",
            signer: "G",
            expect: {
                balance: 9988.333315
            }
        },
        {
            action: "withdraws",
            signer: "H",
            expect: {
                balance: 60
            }
        }
    ]
};

describe("Position Closure Traders After De-listing Perpetual", () => {
    const deployment = readFile(DeploymentConfigs.filePath);
    const provider = getProvider(network.rpc, network.faucet);
    const ownerKeyPair = getKeyPairFromSeed(DeploymentConfigs.deployer);
    const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
    const orderSigner = new OrderSigner(ownerKeyPair);
    let ownerAddress: string;
    let onChain: OnChainCalls;
    let settlementCapID: string;
    let priceOracleCapID: string;
    const accounts = getTestAccounts(provider);

    let tx: SuiExecuteTransactionResponse;
    let lastOraclePrice: BigNumber;

    const getAccount = (name: string): Account => {
        // TODO: can be hashed
        switch (name) {
            case "A":
                return accounts[0];
            case "B":
                return accounts[1];
            case "C":
                return accounts[2];
            case "D":
                return accounts[3];
            case "E":
                return accounts[4];
            case "F":
                return accounts[5];
            case "G":
                return accounts[6];
            case "H":
                return accounts[7];
            default:
                return accounts[0];
        }
    };

    async function executeTest(testCases: Array<any>) {
        testCases.forEach((testCase: any) => {
            let testCaseDescription: string;

            switch (testCase.action) {
                case "trade":
                    testCaseDescription = `${
                        testCase.maker
                    } opens size:${Math.abs(testCase.size)} price:${
                        testCase.price
                    } leverage:${testCase.leverage}x ${
                        testCase.size > 0 ? "Long" : "Short"
                    } against ${testCase.taker}`;
                    break;
                case "remove margin":
                    testCaseDescription = `${testCase.signer} removes margin:${testCase.margin} at oracle price:${testCase.pOracle}`;
                    break;
                case "add margin":
                    testCaseDescription = `${testCase.signer} adds margin:${testCase.margin} at oracle price:${testCase.pOracle}`;
                    break;
                case "delist market":
                    testCaseDescription = `Perpetual De-listed at oracle price:${testCase.pOracle}`;
                    break;
                case "withdraws":
                    testCaseDescription = `${testCase.signer} withdraws position amount using closePosition`;
                    break;
                default:
                    testCaseDescription = `Oracle price changes to ${testCase.pOracle}`;
                    break;
            }

            it(testCaseDescription, async () => {
                testCase.size = testCase.size as number;
                const oraclePrice = toBigNumber(testCase.pOracle as number);

                // set oracle price if need be
                if (
                    testCase.pOracle &&
                    !oraclePrice.isEqualTo(lastOraclePrice)
                ) {
                    expectTxToSucceed(
                        await onChain.updateOraclePrice({
                            price: oraclePrice.toFixed(),
                            updateOPCapID: priceOracleCapID
                        })
                    );
                    lastOraclePrice = oraclePrice;
                }

                // will be undefined for a normal trade action
                const account = getAccount(testCase.signer);

                // will be undefined for all actions except trade
                const curMaker = getAccount(testCase.maker);
                const curTaker = getAccount(testCase.taker);

                // if a trade is to be made
                if (testCase.action == "trade") {
                    const order = createOrder({
                        market: onChain.getPerpetualID(),
                        price: testCase.price,
                        quantity: Math.abs(testCase.size),
                        leverage: testCase.leverage,
                        isBuy: testCase.size > 0,
                        maker: curMaker.address,
                        salt: Date.now()
                    });

                    tx = await onChain.trade(
                        {
                            ...(await Trader.setupNormalTrade(
                                provider,
                                orderSigner,
                                curMaker.keyPair,
                                curTaker.keyPair,
                                order
                            )),
                            settlementCapID
                        },
                        ownerSigner
                    );
                }
                // if margin is to be removed
                else if (testCase.action == "remove margin") {
                    tx = await onChain.removeMargin(
                        { amount: testCase.margin },
                        account.signer
                    );
                }
                // if margin is to be added
                else if (testCase.action == "add margin") {
                    tx = await onChain.addMargin(
                        { amount: testCase.margin },
                        account.signer
                    );
                } else if (testCase.action == "delist market") {
                    tx = await onChain.delistPerpetual({
                        price: toBigNumberStr(testCase.pOracle)
                    });
                }

                // else if withdraws amount (this will have an expect field)
                else if (testCase.action == "withdraws") {
                    tx = await onChain.closePosition({}, account.signer);
                }

                expectTxToSucceed(tx);

                if (testCase.expect) {
                    const bankAcctDetails = await onChain.getBankAccountDetails(
                        account.bankAccountId as string
                    );

                    expect(
                        bankAcctDetails.balance
                            .shiftedBy(-BASE_DECIMALS)
                            .toFixed(6)
                    ).to.be.equal(
                        new BigNumber(testCase.expect.balance).toFixed(6)
                    );
                }
            });
        });
    }

    before(async () => {
        ownerAddress = await getAddressFromSigner(ownerSigner);
        onChain = new OnChainCalls(ownerSigner, deployment);

        const tx = await onChain.createSettlementOperator({
            operator: ownerAddress
        });

        expectTxToSucceed(tx);

        settlementCapID = (
            Transaction.getObjects(tx, "newObject", "SettlementCap")[0] as any
        ).id as string;

        // make owner, the price oracle operator
        const tx1 = await onChain.setPriceOracleOperator({
            operator: ownerAddress
        });

        priceOracleCapID = (
            Transaction.getObjects(
                tx1,
                "newObject",
                "PriceOracleOperatorCap"
            )[0] as any
        ).id as string;
    });

    const setupTest = async () => {
        lastOraclePrice = new BigNumber(0);
        const marketData = await createMarket(
            deployment,
            ownerSigner,
            provider,
            {
                initialMarginRequired: toBigNumberStr(0.0625),
                maintenanceMarginRequired: toBigNumberStr(0.05),
                maxPrice: toBigNumberStr(2000),
                makerFee: toBigNumberStr(0.01),
                takerFee: toBigNumberStr(0.02)
            }
        );

        deployment["markets"]["ETH-PERP"].Objects = marketData.marketObjects;

        onChain = new OnChainCalls(ownerSigner, deployment);

        // deposit 6K to all accounts
        for (let i = 0; i < accounts.length; i++) {
            await onChain.withdrawAllMarginFromBank(accounts[i].signer);
            accounts[i].bankAccountId = await mintAndDeposit(
                onChain,
                accounts[i].address,
                6_000
            );
        }
    };

    describe("Test # 1", () => {
        before(async () => {
            await setupTest();
        });
        executeTest(testCases["Test # 1"]);
    });

    describe("Test # 2", () => {
        before(async () => {
            await setupTest();
        });
        executeTest(testCases["Test # 2"]);
    });

    describe("Test # 3", () => {
        before(async () => {
            await setupTest();
        });
        executeTest(testCases["Test # 3"]);
    });
});
