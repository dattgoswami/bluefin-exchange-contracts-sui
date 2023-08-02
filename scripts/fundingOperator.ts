import * as yargs from "yargs";
import { config } from "dotenv";
import {
    readFile,
    getProvider,
    getSignerFromSeed,
    DeploymentConfigs,
    OnChainCalls,
    network
} from "../submodules/library-sui";

config({ path: ".env" });

const argv = yargs
    .options({
        account: {
            alias: "a",
            type: "string",
            demandOption: false,
            description: "account to which FR capability will be assigned"
        }
    })
    .parseSync();

const deployment = readFile(DeploymentConfigs.filePath);

async function main() {
    const provider = getProvider(network.rpc, network.faucet);
    const capOwner = process.env.DEPLOYER_SEED as string;
    const capOwnerSigner = getSignerFromSeed(capOwner, provider);
    const onChain = new OnChainCalls(capOwnerSigner, deployment);
    const resp = await onChain.setFundingRateOperator({
        operator: argv.account as string
    });
    console.log("funding rate cap successfully transferred", resp);
}
main();
