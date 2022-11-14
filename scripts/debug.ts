import {
    SerializeField,
    DataType,
    BinarySerializer
} from "ts-binary-serializer";
import { bcs } from "@mysten/sui.js";
import { DeploymentConfig } from "../src/DeploymentConfig";
import {
    readFile,
    getProvider,
    getSignerSUIAddress,
    getSignerFromSeed,
    getStatus
} from "../src/utils";
import { OnChainCalls } from "../src/OnChainCalls";

let deployment = readFile(DeploymentConfig.filePath);

const provider = getProvider(
    DeploymentConfig.rpcURL,
    DeploymentConfig.faucetURL
);
const ownerSigner = getSignerFromSeed(DeploymentConfig.deployer, provider);

const onChain = new OnChainCalls(ownerSigner, deployment);

// class A{
//     @SerializeField(DataType.String)
//     public utf8_str:string = "Hello, world!";
//     @SerializeField(DataType.Int32)
//     public an_int = 1;

// }

// interface B{
//     utf8_str:string
// }

// const avro = require('avsc');

async function main() {
    // const txResponse = await onChain.createPerpetual({});
    // console.log(JSON.stringify(txResponse));

    const obj = await onChain.getOnChainObject(
        "0x5aabb522d56cb5c47d66c2a7405740dd305ec9f8"
    );
    console.log(JSON.stringify(obj));

    //  bcs.STRING;

    // const type = avro.Type.forValue({
    //     utf8_str: "Hello, world!",
    //   });

    // const buf:Buffer = type.toBuffer({utf8_str: "Hello, world!"}); // Encoded buffer.
    // const val = type.fromBuffer(buf); // = {kind: 'CAT', name: 'Albert'}

    // console.log(buf.toJSON());
    // console.log(val);

    // // BinarySerializer.Serialize({utf8_str:"a"}, );

    // let binaryData = BinarySerializer.Serialize(new A(),A);
    // console.log(binaryData);

    // let a2 = BinarySerializer.Deserialize(binaryData,A);
    // console.log(a2);

    // const error = `MoveAbort(ModuleId { address: 16d640b50b10fa7d592122381e70703af41becea, name: Identifier("foundation") }, 1)`

    // console.log();
}

main();
