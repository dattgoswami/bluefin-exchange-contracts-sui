import {
    getMakerTakerAccounts,
    getTestAccounts,
    MakerTakerAccounts
} from "./accounts";
import { network, DeploymentConfig } from "../../src/DeploymentConfig";
import {
    createOrder,
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
import { expectTxToFail, expectTxToSucceed } from "./expect";

const provider = getProvider(network.rpc, network.faucet);
const ownerSigner = getSignerFromSeed(DeploymentConfig.deployer, provider);
let deployment = readFile(DeploymentConfig.filePath);
let onChain: OnChainCalls = new OnChainCalls(ownerSigner, deployment);

const testAcct = getTestAccounts(provider)[0];
const orderSigner = new OrderSigner(testAcct.keyPair);

export async function executeTests(testCases: Object) {
    let MakerTakerAccounts: MakerTakerAccounts;

    Object.keys(testCases).forEach((testName) => {
        describe(testName, () => {
            (testCases as any)[testName].forEach((testCase: any) => {
                before(async () => {
                    MakerTakerAccounts = getMakerTakerAccounts(provider);
                    // await initState();
                });

                it(`Alice opens size:${Math.abs(testCase.size)} price:${
                    testCase.price
                } leverage:${testCase.leverage}x ${
                    testCase.size > 0 ? "Long" : "Short"
                } against Bob`, async () => {
                    const oraclePrice = toBigNumber(testCase.pOracle);

                    // todo set oracle price over here
                    const order = createOrder({
                        price: testCase.price,
                        quantity: Math.abs(testCase.size),
                        leverage: testCase.leverage,
                        isBuy: testCase.size > 0,
                        makerAddress: MakerTakerAccounts.maker.address,
                        salt: Date.now()
                    });

                    // const tx = await onChain.trade(
                    //     await Trader.setupNormalTrade(
                    //         provider,
                    //         orderSigner,
                    //         MakerTakerAccounts.maker.keyPair,
                    //         MakerTakerAccounts.taker.keyPair,
                    //         order
                    //     ),
                    //     ownerSigner // owner is whitelisted as settlement operator
                    // );

                    // expectTxToSucceed(tx);

                    // const position = Transaction.getAccountPositionFromEvent(
                    //     tx,
                    //     MakerTakerAccounts.taker.address
                    //     );
                });
            });
        });
    });
}
