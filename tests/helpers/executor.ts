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
import { postDeployment } from "../helpers/utils";
import { config } from "dotenv";

import { RawSigner } from "@mysten/sui.js";
config({ path: ".env" });

const DEBUG = process.env.DEBUG == "true";

const provider = getProvider(network.rpc, network.faucet);
const ownerKeyPair = getKeyPairFromSeed(DeploymentConfigs.deployer);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
const orderSigner = new OrderSigner(ownerKeyPair);
const deployment = readFile(DeploymentConfigs.filePath);
let onChain: OnChainCalls;
let liquidatorAddress: string;

export async function executeTests(
    testCases: object,
    marketConfig: MarketDetails,
    postDeployment: (
        onChain: OnChainCalls,
        ownerSigner: RawSigner
    ) => Promise<void>
) {
    let MakerTakerAccounts: MakerTakerAccounts;
    let tx: SuiExecuteTransactionResponse = undefined as any;
    let lastOraclePrice: BigNumber;
    let leverage: BigNumber;

    Object.keys(testCases).forEach((testName) => {
        describe(testName, () => {
            (testCases as any)[testName].forEach((testCase: any) => {
                before(async () => {
                    MakerTakerAccounts = getMakerTakerAccounts(provider);
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

                const testCaseName =
                    testCase.tradeType == "liquidation"
                        ? `Liquidator liquidates Alice at oracle price: ${
                              testCase.pOracle
                          } leverage:${testCase.leverage}x size:${Math.abs(
                              testCase.size
                          )}`
                        : testCase.tradeType == "filler"
                        ? `Liquidator opens size:${Math.abs(
                              testCase.size
                          )} price:${testCase.price} leverage:${
                              testCase.leverage
                          }x ${
                              testCase.size > 0 ? "Long" : "Short"
                          } against Bob`
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
                    const oraclePrice = toBigNumber(testCase.pOracle);

                    // set oracle price if need be
                    if (!oraclePrice.isEqualTo(lastOraclePrice)) {
                        const priceTx = await onChain.updateOraclePrice({
                            price: oraclePrice.toFixed()
                        });
                        expectTxToSucceed(priceTx);
                        lastOraclePrice = oraclePrice;
                    }

                    // normal or filler trade
                    // normal trade is between alice and bob
                    // filler trade is between liquidator and bob
                    if (testCase.size && testCase.tradeType != "liquidation") {
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
                                // if trade type is filler, specify leverage for taker/bob
                                // as the leverage used in normal/last trade
                                {
                                    takerOrder:
                                        testCase.tradeType == "filler"
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
                                leverage: toBigNumberStr(testCase.leverage)
                            },
                            ownerSigner
                        );
                    }
                    // add margin
                    else if (testCase.addMargin >= 0) {
                        tx = await onChain.addMargin(
                            { amount: testCase.addMargin },
                            MakerTakerAccounts.taker.signer
                        );
                    }
                    // remove margin
                    else if (testCase.removeMargin >= 0) {
                        tx = await onChain.removeMargin(
                            { amount: testCase.removeMargin },
                            MakerTakerAccounts.taker.signer
                        );
                    }
                    // adjust leverage
                    else if (testCase.adjustLeverage >= 0) {
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
                            (ERROR_CODES as any)[testCase.expectError]
                        );
                        return;
                    }

                    if (DEBUG) {
                        console.log(JSON.stringify(tx));
                    }

                    expectTxToSucceed(tx);

                    // if an expect for maker or taker exists
                    if (testCase.expectMaker || testCase.expectTaker) {
                        const account =
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
        if (testCase.tradeType == "filler") {
            return {
                maker: {
                    address: liquidatorAddress,
                    keyPair: ownerKeyPair,
                    signer: ownerSigner
                },
                taker: {
                    address: MakerTakerAccounts.taker.address,
                    keyPair: MakerTakerAccounts.taker.keyPair,
                    signer: MakerTakerAccounts.taker.signer
                }
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
