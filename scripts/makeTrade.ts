import { DeploymentConfigs } from "../submodules/library-sui";
import {
    readFile,
    getProvider,
    getSignerFromSeed,
    createOrder,
    OnChainCalls,
    OrderSigner,
    Trader,
    Transaction
} from "../submodules/library-sui";

import { getMakerTakerAccounts } from "../tests/helpers/accounts";

import { mintAndDeposit } from "../tests/helpers/utils";

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
    // settlement operator and its the first settlement operator
    const settlementCapID = onChain.getSettlementOperators()[0].capID;

    // mint and deposit USDC to test accounts

    await mintAndDeposit(onChain, accounts.maker.address);

    await mintAndDeposit(onChain, accounts.taker.address);

    //set specific price on oracle
    await onChain.setOraclePrice({
        price: 1800,
        market: tradingPerp
    });

    const order = createOrder({
        maker: accounts.maker.address,
        market: onChain.getPerpetualID(tradingPerp),
        isBuy: true,
        price: 1800,
        leverage: 1,
        quantity: 0.1
    });

    const tradeData = await Trader.setupNormalTrade(
        provider,
        signer,
        accounts.maker.keyPair,
        accounts.taker.keyPair,
        order
    );

    const tx = await onChain.trade({
        ...tradeData,
        settlementCapID
    });

    const status = Transaction.getStatus(tx);
    console.log("Status:", status);

    if (status == "failure") {
        console.log("Error:", Transaction.getError(tx));
        return;
    }

    console.log(
        "Maker bank balance: ",
        +(await onChain.getUserBankBalance(accounts.maker.address))
    );
    console.log(
        "Maker Position: ",
        await onChain.getUserPosition(tradingPerp, accounts.maker.address)
    );

    console.log(
        "Taker bank balance: ",
        +(await onChain.getUserBankBalance(accounts.taker.address))
    );
    console.log(
        "Taker Position: ",
        await onChain.getUserPosition(tradingPerp, accounts.taker.address)
    );
}

main();
