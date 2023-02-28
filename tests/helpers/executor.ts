import { getMakerTakerAccounts, MakerTakerAccounts } from "./accounts";
import { network, DeploymentConfigs } from "../../src/DeploymentConfig";
import {
    createMarket,
    createOrder,
    getKeyPairFromSeed,
    getProvider,
    getSignerFromSeed,
    getSignerSUIAddress,
    readFile
} from "../../src/utils";
import { toBigNumber, toBigNumberStr } from "../../src/library";
import { OnChainCalls, OrderSigner, Trader, Transaction } from "../../src";
import {
    evaluateSystemExpect,
    expect,
    expectTxToFail,
    expectTxToSucceed,
    evaluateAccountPositionExpect
} from "./expect";
import { MarketDetails } from "../../src/interfaces";
import { ERROR_CODES } from "../../src/errors";
import { SuiExecuteTransactionResponse } from "@mysten/sui.js";
import BigNumber from "bignumber.js";
import { config } from "dotenv";
import { postDeployment } from "./utils";
import { TestCaseJSON } from "./interfaces";
config({ path: ".env" });

const provider = getProvider(network.rpc, network.faucet);
const ownerKeyPair = getKeyPairFromSeed(DeploymentConfigs.deployer);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
const orderSigner = new OrderSigner(ownerKeyPair);
const deployment = readFile(DeploymentConfigs.filePath);
let onChain: OnChainCalls;
let liquidatorAddress: string;

export async function executeTests(
    testCases: TestCaseJSON,
    marketConfig: MarketDetails
) {
    // used to perform normal trades
    let MakerTakerAccounts: MakerTakerAccounts;
    // accounts are used to perform filler trades during adl tests
    let ADLFillerTradeMakerTakerAccounts: MakerTakerAccounts;

    let tx: SuiExecuteTransactionResponse;
    let lastOraclePrice: BigNumber;
    let leverage: BigNumber;

    Object.keys(testCases).forEach((testName) => {
        describe(testName, () => {
            testCases[testName].forEach((testCase) => {
                before(async () => {
                    MakerTakerAccounts = getMakerTakerAccounts(provider);
                    ADLFillerTradeMakerTakerAccounts = getMakerTakerAccounts(
                        provider,
                        true
                    );

                    // TODO fund accounts with usdc

                    lastOraclePrice = new BigNumber(0);
                    // init state
                    deployment["markets"] = [
                        {
                            Objects: await createMarket(
                                deployment,
                                ownerSigner,
                                provider,
                                marketConfig
                            )
                        }
                    ];

                    onChain = new OnChainCalls(ownerSigner, deployment);
                    // post deployment steps
                    await postDeployment(onChain, ownerSigner);

                    // deployer will be performing all liquidations
                    liquidatorAddress = await getSignerSUIAddress(ownerSigner);
                });

                testCase.size = testCase.size as any as number;

                const testCaseName =
                    testCase.tradeType == "liquidation"
                        ? `Liquidator liquidates Alice at oracle price: ${
                              testCase.pOracle
                          } leverage:${testCase.leverage}x size:${Math.abs(
                              testCase.size
                          )}`
                        : testCase.tradeType == "liq_filler"
                        ? `Liquidator opens size:${Math.abs(
                              testCase.size
                          )} price:${testCase.price} leverage:${
                              testCase.leverage
                          }x ${
                              testCase.size > 0 ? "Long" : "Short"
                          } against Bob`
                        : testCase.tradeType == "adl_filler"
                        ? `Cat opens size:${Math.abs(testCase.size)} price:${
                              testCase.price
                          } leverage:${testCase.leverage}x ${
                              testCase.size > 0 ? "Long" : "Short"
                          } against dog`
                        : testCase.tradeType == "deleveraging"
                        ? `Deleveraging Alice against Cat at oracle price: ${
                              testCase.pOracle
                          } size:${Math.abs(testCase.size)}`
                        : testCase.size && testCase.size != 0
                        ? `Alice opens size:${Math.abs(testCase.size)} price:${
                              testCase.price
                          } leverage:${testCase.leverage}x ${
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
                            price: oraclePrice.toFixed()
                        });
                        expectTxToSucceed(priceTx);
                        lastOraclePrice = oraclePrice;
                    }

                    // normal, liq_filler or adl_filler trade
                    // normal trade is between alice and bob
                    // liq_filler trade is between liquidator and bob
                    // adl_filler trade is between cat and dog
                    if (
                        testCase.size &&
                        testCase.tradeType != "liquidation" &&
                        testCase.tradeType != "deleveraging"
                    ) {
                        const { maker, taker } = getMakerTakerOfTrade(testCase);

                        const order = createOrder({
                            price: testCase.price,
                            quantity: Math.abs(testCase.size),
                            leverage: testCase.leverage,
                            isBuy: testCase.size > 0,
                            makerAddress: maker.address,
                            salt: Date.now()
                        });

                        tx = await onChain.trade(
                            await Trader.setupNormalTrade(
                                provider,
                                orderSigner,
                                maker.keyPair,
                                taker.keyPair,
                                order,
                                // if trade type is liq_filler, specify leverage for taker/bob
                                // as the leverage used in normal/last trade
                                {
                                    takerOrder:
                                        testCase.tradeType == "liq_filler"
                                            ? {
                                                  ...order,
                                                  leverage,
                                                  isBuy: !order.isBuy,
                                                  maker: taker.address
                                              }
                                            : undefined
                                }
                            ),
                            ownerSigner
                        );

                        // save leverage, can be used for bob/taker in next filler trade
                        leverage = order.leverage;
                    }
                    // liquidation trade
                    else if (testCase.tradeType == "liquidation") {
                        tx = await onChain.liquidate(
                            {
                                liquidatee: MakerTakerAccounts.maker.address,
                                quantity: toBigNumberStr(
                                    Math.abs(testCase.size)
                                ),
                                leverage: toBigNumberStr(
                                    testCase.leverage as any as number
                                )
                            },
                            ownerSigner
                        );
                    }
                    // deleveraging trade
                    else if (testCase.tradeType == "deleveraging") {
                        tx = await onChain.deleverage(
                            {
                                maker: MakerTakerAccounts.maker.address,
                                taker: ADLFillerTradeMakerTakerAccounts.maker
                                    .address,
                                quantity: toBigNumberStr(
                                    Math.abs(testCase.size)
                                )
                            },
                            ownerSigner
                        );
                    }
                    // add margin
                    else if (testCase.addMargin != undefined) {
                        tx = await onChain.addMargin(
                            { amount: testCase.addMargin },
                            MakerTakerAccounts.taker.signer
                        );
                    }
                    // remove margin
                    else if (testCase.removeMargin != undefined) {
                        tx = await onChain.removeMargin(
                            { amount: testCase.removeMargin },
                            MakerTakerAccounts.taker.signer
                        );
                    }
                    // adjust leverage
                    else if (testCase.adjustLeverage != undefined) {
                        tx = await onChain.adjustLeverage(
                            { leverage: testCase.adjustLeverage },
                            MakerTakerAccounts.taker.signer
                        );
                    }

                    // if error is expected
                    if (testCase.expectError) {
                        // TODO: Remove this once margin bank is implemented
                        if (testCase.expectError == 600) return;

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
                        const account =
                            // if expect maker does not exists,
                            // there will be expect taker
                            testCase.expectMaker == undefined
                                ? MakerTakerAccounts.taker.address
                                : MakerTakerAccounts.maker.address;

                        evaluateAccountPositionExpect(
                            account,
                            testCase.expectMaker || testCase.expectTaker,
                            oraclePrice,
                            tx
                        );
                    }

                    // if an expect for liquidator exists
                    if (testCase.expectLiquidator) {
                        evaluateAccountPositionExpect(
                            liquidatorAddress,
                            testCase.expectLiquidator,
                            oraclePrice,
                            tx
                        );
                    }

                    // if an expect for cat exists. either adl_filler trade
                    //  or adl deleveraging trade has happened
                    if (testCase.expectCat) {
                        evaluateAccountPositionExpect(
                            ADLFillerTradeMakerTakerAccounts.maker.address,
                            testCase.expectCat,
                            oraclePrice,
                            tx
                        );
                    }

                    // if asked to evaluate system expects
                    if (testCase.expectSystem) {
                        evaluateSystemExpect(testCase.expectSystem, onChain);
                    }
                });
            });
        });
    });

    // helper method to extract maker/taker of trade
    function getMakerTakerOfTrade(testCase: any) {
        if (testCase.tradeType == "liq_filler") {
            return {
                maker: {
                    address: liquidatorAddress,
                    keyPair: ownerKeyPair,
                    signer: ownerSigner
                },
                taker: MakerTakerAccounts.taker
            };
        } else if (testCase.tradeType == "adl_filler") {
            return {
                maker: ADLFillerTradeMakerTakerAccounts.maker,
                taker: ADLFillerTradeMakerTakerAccounts.taker
            };
        } else {
            return {
                maker: {
                    address: MakerTakerAccounts.maker.address,
                    keyPair: MakerTakerAccounts.maker.keyPair,
                    signer: MakerTakerAccounts.maker.signer
                },
                taker: {
                    address: MakerTakerAccounts.taker.address,
                    keyPair: MakerTakerAccounts.taker.keyPair,
                    signer: MakerTakerAccounts.taker.signer
                }
            };
        }
    }
}
