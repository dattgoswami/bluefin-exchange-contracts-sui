import { DeploymentConfigs } from "../submodules/library-sui";
import {
    readFile,
    getProvider,
    getSignerFromSeed,
    createOrder,
    OnChainCalls,
    OrderSigner,
    Trader,
    requestGas,
    Transaction
} from "../submodules/library-sui";

import { getMakerTakerAccounts } from "../tests/helpers/accounts";

import { mintAndDeposit } from "../tests/helpers/utils";
//import { expectTxToSucceed } from "../tests/helpers/expect";

const deployment = readFile(DeploymentConfigs.filePath);

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);

const accounts = getMakerTakerAccounts(provider, false);

const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

const onChain = new OnChainCalls(ownerSigner, deployment);

const signer = new OrderSigner(accounts.maker.keyPair);

async function main() {
    const tradingPerp = "ETH-PERP";

    // Note: Assumes that the deployer is admin, as only admin can make a
    // settlement operator
    // make admin of the exchange settlement operator
    //const tx1 = await onChain.createSettlementOperator({
    //    operator: await ownerSigner.getAddress()
    //});
    //const settlementCapID = Transaction.getCreatedObjectIDs(tx1)[1];

    // mint and deposit USDC to test accounts
    console.log(
        await requestGas(
            "0x1ffa85757f95ceced28622d30e41a452c88516df53450cb1913812dd828d5968"
        )
    );
    await mintAndDeposit(
        onChain,
        "0x1ffa85757f95ceced28622d30e41a452c88516df53450cb1913812dd828d5968"
    );
    await mintAndDeposit(onChain, accounts.taker.address);

    // set specific price on oracle
    //  const tx3 = await onChain.updateOraclePrice({
    //    price: toBigNumberStr(1800)
    //});
    // expectTxToSucceed(tx3);
}

main();
