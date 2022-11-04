import { config } from "dotenv";
config({ path: ".env" });

interface DeploymentConfig {
    rpcURL:string;
    deployer:string;
    filePath:string;
}


export const DeploymentConfig:DeploymentConfig  = {
    rpcURL: process.env.RPC_URL || "",
    deployer: process.env.DEPLOYER_SEED || "",
    filePath: "./deployment.json" // Todo will create separate files for separate networks
}