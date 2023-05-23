import { createAccount, getTestAccounts } from "./accounts";
import { network, DeploymentConfigs } from "../../submodules/library-sui";
import {
    createMarket,
    createOrder,
    getKeyPairFromSeed,
    getProvider,
    getSignerFromSeed,
    readFile,
    requestGas
} from "../../submodules/library-sui";
import { toBigNumber, toBigNumberStr } from "../../submodules/library-sui";
import { OnChainCalls, OrderSigner, Trader, Transaction } from "../../submodules/library-sui";
import {
    evaluateSystemExpect,
    expect,
    expectTxToFail,
    expectTxToSucceed,
    evaluateAccountPositionExpect
} from "./expect";
import { MarketDetails } from "../../submodules/library-sui";
import { ERROR_CODES } from "../../submodules/library-sui";
import BigNumber from "bignumber.js";
import { config } from "dotenv";
import { fundTestAccounts, mintAndDeposit } from "./utils";
import { TestCaseJSON } from "./interfaces";
import { SuiTransactionBlockResponse } from "@mysten/sui.js";
config({ path: ".env" });

const provider = getProvider(network.rpc, network.faucet);
const ownerKeyPair = getKeyPairFromSeed(DeploymentConfigs.deployer);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
const orderSigner = new OrderSigner(ownerKeyPair);
const deployment = readFile(DeploymentConfigs.filePath);
let onChain: OnChainCalls;
let settlementCapID: string;
let priceOracleCapID: string;
let deleveragingCapID: string;

export async function executeTests(
    testCases: TestCaseJSON,
    marketConfig: MarketDetails,
    initialBalances?: { traders?: number; liquidator?: number }
) {
    const [alice, bob, cat, dog, liquidator] = getTestAccounts(provider);

    let tx: SuiTransactionBlockResponse;
    let lastOraclePrice: BigNumber;
    let feePoolAddress: string;
    let insurancePoolAddress: string;

    const setupTest = async () => {
        lastOraclePrice = new BigNumber(0);
        feePoolAddress = createAccount(provider).address;
        insurancePoolAddress = createAccount(provider).address;

        const marketData = await createMarket(
            deployment,
            ownerSigner,
            provider,
            {
                ...marketConfig,
                feePool: feePoolAddress,
                insurancePool: insurancePoolAddress,
                startingTime: Date.now() - 1000
            }
        );

        // init state
        deployment["markets"]["ETH-PERP"]["Objects"] = marketData.marketObjects;

        deployment.bankAccounts = {
            ...deployment.bankAccounts,
            ...marketData.bankAccounts
        };

        onChain = new OnChainCalls(ownerSigner, deployment);

        // empty all accounts
        await onChain.withdrawAllMarginFromBank(alice.signer, 90000000);
        await onChain.withdrawAllMarginFromBank(bob.signer, 90000000);
        await onChain.withdrawAllMarginFromBank(cat.signer, 90000000);
        await onChain.withdrawAllMarginFromBank(dog.signer, 90000000);
        await onChain.withdrawAllMarginFromBank(liquidator.signer, 90000000);

        // provide maker/taker starting margin in margin bank
        alice.bankAccountId = await mintAndDeposit(
            onChain,
            alice.address,
            initialBalances?.traders || 2_000
        );

        bob.bankAccountId = await mintAndDeposit(
            onChain,
            bob.address,
            initialBalances?.traders || 2_000
        );

        cat.bankAccountId = await mintAndDeposit(onChain, cat.address, 5_000);

        dog.bankAccountId = await mintAndDeposit(onChain, dog.address, 5_000);

        liquidator.bankAccountId = await mintAndDeposit(
            onChain,
            liquidator.address,
            initialBalances?.liquidator || 5_000
        );
    };

    // described block is being used here just to to have `before`
    // method so that capabilities can be initialized
    describe("", () => {
        before(async () => {
            onChain = new OnChainCalls(ownerSigner, deployment);

            const address = await onChain.signer.getAddress();

            //fund the admin with Sui
            await requestGas(address);

            // make owner, the price oracle operator
            const tx1 = await onChain.setPriceOracleOperator({
                operator: address
            });
            priceOracleCapID = Transaction.getCreatedObjectIDs(tx1)[0];

            // make admin settlement operator
            const tx2 = await onChain.createSettlementOperator({
                operator: address
            });
            settlementCapID = Transaction.getCreatedObjectIDs(tx2)[0];

            // make admin deleveraging operator
            const tx3 = await onChain.setDeleveragingOperator({
                operator: address
            });

            deleveragingCapID = Transaction.getCreatedObjectIDs(tx3)[0];
        });

        Object.keys(testCases).forEach((testName) => {
            describe(testName, () => {
                before(async () => {
                    await setupTest();
                });

                testCases[testName].forEach(async (testCase) => {
                    testCase.size = testCase.size as any as number;

                    const testCaseName =
                        testCase.tradeType == "liquidation"
                            ? `Liquidator liquidates Alice at oracle price: ${
                                  testCase.pOracle
                              } leverage:${testCase.leverage}x size:${Math.abs(
                                  testCase.size
                              )}`
                            : testCase.tradeType == "liquidator_bob"
                            ? `Liquidator opens size:${Math.abs(
                                  testCase.size
                              )} price:${testCase.price} leverage:${
                                  testCase.leverage
                              }x ${
                                  testCase.size > 0 ? "Long" : "Short"
                              } against Bob`
                            : testCase.tradeType == "liquidator_cat"
                            ? `Liquidator opens size:${Math.abs(
                                  testCase.size
                              )} price:${testCase.price} leverage:${
                                  testCase.leverage
                              }x ${
                                  testCase.size > 0 ? "Long" : "Short"
                              } against Bob`
                            : testCase.tradeType == "cat_dog"
                            ? `Cat opens size:${Math.abs(
                                  testCase.size
                              )} price:${testCase.price} leverage:${
                                  testCase.leverage
                              }x ${
                                  testCase.size > 0 ? "Long" : "Short"
                              } against dog`
                            : testCase.tradeType == "deleveraging"
                            ? `Deleveraging Alice against Cat at oracle price: ${
                                  testCase.pOracle
                              } size:${Math.abs(testCase.size)}`
                            : testCase.isTaker == true
                            ? `Bob opens size:${Math.abs(
                                  testCase.size
                              )} price:${testCase.price} leverage:${
                                  testCase.leverage
                              }x ${
                                  testCase.size > 0 ? "Long" : "Short"
                              } against Alice`
                            : testCase.size && testCase.size != 0
                            ? `Alice opens size:${Math.abs(
                                  testCase.size
                              )} price:${testCase.price} leverage:${
                                  testCase.leverage
                              }x ${
                                  testCase.size > 0 ? "Long" : "Short"
                              } against Bob`
                            : testCase.addMargin != undefined
                            ? `Bob adds margin: ${testCase.addMargin} to position`
                            : testCase.removeMargin != undefined
                            ? `Bob removes margin: ${testCase.removeMargin} from position`
                            : testCase.adjustLeverage != undefined
                            ? `Bob adjusts leverage: ${testCase.adjustLeverage}`
                            : `Price oracle updated to ${testCase.pOracle}`;

                    it(testCaseName, async () => {
                        testCase.size = testCase.size as any as number;
                        const oraclePrice = toBigNumber(
                            testCase.pOracle as any as number
                        );

                        // set oracle price if need be
                        if (!oraclePrice.isEqualTo(lastOraclePrice)) {
                            const priceTx = await onChain.updateOraclePrice({
                                price: oraclePrice.toFixed(),
                                updateOPCapID: priceOracleCapID
                            });
                            expectTxToSucceed(priceTx);
                            lastOraclePrice = oraclePrice;
                        }

                        // normal, liquidator_bob or cat_dog trade
                        // normal trade is between alice and bob
                        // liquidator_bob trade is between liquidator and bob
                        // liquidator_bob trade is between liquidator and cat
                        // cat_dog trade is between cat and dog
                        if (
                            testCase.size &&
                            testCase.tradeType != "liquidation" &&
                            testCase.tradeType != "deleveraging"
                        ) {
                            const { maker, taker } =
                                getMakerTakerOfTrade(testCase);

                            const order = createOrder({
                                market: onChain.getPerpetualID(),
                                price: testCase.price,
                                quantity: Math.abs(testCase.size),
                                leverage: testCase.leverage,
                                isBuy: testCase.size > 0,
                                maker: maker.address,
                                salt: Date.now()
                            });

                            if (testCase.tradeType == "liquidator_bob") {
                                await onChain.adjustLeverage(
                                    {
                                        leverage: testCase.leverage as number,
                                        gasBudget: 50000000
                                    },
                                    taker.signer
                                );
                            }

                            tx = await onChain.trade(
                                {
                                    ...(await Trader.setupNormalTrade(
                                        provider,
                                        orderSigner,
                                        maker.keyPair,
                                        taker.keyPair,
                                        order
                                    )),
                                    settlementCapID,
                                    gasBudget: 900000000
                                },
                                ownerSigner
                            );
                        }
                        // liquidation trade
                        else if (testCase.tradeType == "liquidation") {
                            tx = await onChain.liquidate(
                                {
                                    liquidatee: alice.address,
                                    quantity: toBigNumberStr(
                                        Math.abs(testCase.size)
                                    ),
                                    leverage: toBigNumberStr(
                                        testCase.leverage as any as number
                                    ),
                                    gasBudget: 900000000
                                },
                                liquidator.signer
                            );
                        }
                        // deleveraging trade
                        else if (testCase.tradeType == "deleveraging") {
                            tx = await onChain.deleverage(
                                {
                                    maker: alice.address,
                                    taker: cat.address,
                                    quantity: toBigNumberStr(
                                        Math.abs(testCase.size)
                                    ),
                                    deleveragingCapID,
                                    gasBudget: 900000000
                                },
                                ownerSigner
                            );
                        }
                        // add margin
                        else if (testCase.addMargin != undefined) {
                            tx = await onChain.addMargin(
                                {
                                    amount: testCase.addMargin,
                                    gasBudget: 90000000
                                },
                                bob.signer
                            );
                        }
                        // remove margin
                        else if (testCase.removeMargin != undefined) {
                            tx = await onChain.removeMargin(
                                {
                                    amount: testCase.removeMargin,
                                    gasBudget: 90000000
                                },
                                bob.signer
                            );
                        }
                        // adjust leverage
                        else if (testCase.adjustLeverage != undefined) {
                            tx = await onChain.adjustLeverage(
                                {
                                    leverage: testCase.adjustLeverage,
                                    gasBudget: 50000000
                                },
                                bob.signer
                            );
                        }

                        // if error is expected
                        if (testCase.expectError) {
                            expectTxToFail(tx);
                            expect(Transaction.getError(tx)).to.be.equal(
                                ERROR_CODES[testCase.expectError]
                            );
                            return;
                        }

                        // console.log(JSON.stringify(tx));
                        expectTxToSucceed(tx);

                        // if an expect for maker or taker exists
                        if (testCase.expectMaker || testCase.expectTaker) {
                            // if expect maker does not exists,
                            // there will be expect taker
                            const account =
                                testCase.expectMaker == undefined ? bob : alice;

                            await evaluateAccountPositionExpect(
                                onChain,
                                account,
                                testCase.expectMaker || testCase.expectTaker,
                                oraclePrice,
                                tx
                            );
                        }

                        // if an expect for liquidator exists
                        if (testCase.expectLiquidator) {
                            await evaluateAccountPositionExpect(
                                onChain,
                                liquidator,
                                testCase.expectLiquidator,
                                oraclePrice,
                                tx
                            );
                        }

                        // if an expect for cat exists. either cat_dog trade
                        //  or adl deleveraging trade has happened
                        if (testCase.expectCat) {
                            await evaluateAccountPositionExpect(
                                onChain,
                                cat,
                                testCase.expectCat,
                                oraclePrice,
                                tx
                            );
                        }

                        // if asked to evaluate system expects
                        if (testCase.expectSystem) {
                            await evaluateSystemExpect(
                                onChain,
                                testCase.expectSystem,
                                feePoolAddress,
                                insurancePoolAddress,
                                onChain.getPerpetualID()
                            );
                        }
                    });
                });
            });
        });
    });
    // helper method to extract maker/taker of trade
    function getMakerTakerOfTrade(testCase: any) {
        if (testCase.tradeType == "liquidator_bob") {
            return {
                maker: liquidator,
                taker: bob
            };
        } else if (testCase.tradeType == "liquidator_cat") {
            return {
                maker: liquidator,
                taker: cat
            };
        } else if (testCase.tradeType == "cat_dog") {
            return {
                maker: cat,
                taker: dog
            };
        } else {
            if (testCase.isTaker) {
                return {
                    taker: alice,
                    maker: bob
                };
            } else {
                return {
                    maker: alice,
                    taker: bob
                };
            }
        }
    }
}
