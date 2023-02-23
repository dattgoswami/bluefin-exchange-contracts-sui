import { getMakerTakerAccounts, MakerTakerAccounts } from "./accounts";
import { network, DeploymentConfigs } from "../../src/DeploymentConfig";
import {
    createMarket,
    createOrder,
    getKeyPairFromSeed,
    getProvider,
    getSignerFromSeed,
    readFile
} from "../../src/utils";
import { toBigNumber } from "../../src/library";
import {
    OnChainCalls,
    OrderSigner,
    Trader,
    Transaction
} from "../../src/classes";
import {
    evaluateSystemExpect,
    expect,
    expectPosition,
    expectTxToFail,
    expectTxToSucceed
} from "./expect";
import { MarketConfig } from "./interfaces";
import { getExpectedTestPosition, toExpectedPositionFormat } from "./utils";
import { Balance } from "../../src/classes/Balance";
import { UserPositionExtended } from "../../src/interfaces";
import { ERROR_CODES } from "../../src/errors";
import { SuiExecuteTransactionResponse } from "@mysten/sui.js";
import BigNumber from "bignumber.js";

import { config } from "dotenv";
config({ path: ".env" });

const DEBUG = process.env.DEBUG == "true";

const provider = getProvider(network.rpc, network.faucet);
const ownerKeyPair = getKeyPairFromSeed(DeploymentConfigs.deployer);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
const orderSigner = new OrderSigner(ownerKeyPair);
let deployment = readFile(DeploymentConfigs.filePath);
let onChain: OnChainCalls;

export async function executeTests(
    testCases: Object,
    marketConfig: MarketConfig,
    postDeployment: Function
) {
    let MakerTakerAccounts: MakerTakerAccounts;
    let tx: SuiExecuteTransactionResponse = undefined as any;
    let lastOraclePrice: BigNumber;

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
                });

                // The add/remove margin tests are for taker not maker
                const testCaseName =
                    // 1. if size specified, its a Normal Trade
                    testCase.size && testCase.size != 0
                        ? `Alice opens size:${Math.abs(testCase.size)} price:${
                              testCase.price
                          } leverage:${testCase.leverage}x ${
                              testCase.size > 0 ? "Long" : "Short"
                          } against Bob`
                        : // 2. Add Margin
                        testCase.addMargin != undefined
                        ? `Bob adds margin: ${testCase.addMargin} to position`
                        : // 3. Remove Margin
                        testCase.removeMargin != undefined
                        ? `Bob removes margin: ${testCase.removeMargin} from position`
                        : // 4. Price oracle update}
                        testCase.adjustLeverage != undefined
                        ? `Bob adjusts leverage: ${testCase.adjustLeverage}`
                        : // 5. Price oracle update}
                          `Price oracle updated to ${testCase.pOracle}`;

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

                    // normal trade
                    if (testCase.size) {
                        const order = createOrder({
                            price: testCase.price,
                            quantity: Math.abs(testCase.size),
                            leverage: testCase.leverage,
                            isBuy: testCase.size > 0,
                            makerAddress: MakerTakerAccounts.maker.address,
                            salt: Date.now()
                        });

                        tx = await onChain.trade(
                            await Trader.setupNormalTrade(
                                provider,
                                orderSigner,
                                MakerTakerAccounts.maker.keyPair,
                                MakerTakerAccounts.taker.keyPair,
                                order
                            ),
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

                        const position =
                            Transaction.getAccountPositionFromEvent(
                                tx,
                                account
                            ) as UserPositionExtended;

                        const expectedPosition = getExpectedTestPosition(
                            testCase.expectMaker || testCase.expectTaker
                        );

                        const onChainPosition = toExpectedPositionFormat(
                            Balance.fromPosition(position),
                            oraclePrice
                        );
                        expectPosition(onChainPosition, expectedPosition);
                    }

                    // if asked to evaluate system expects
                    if (testCase.expectSystem) {
                        evaluateSystemExpect(testCase.expectSystem, onChain);
                    }
                });
            });
        });
    });
}
