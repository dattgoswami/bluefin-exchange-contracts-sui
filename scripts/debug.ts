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
    requestGas
} from "../src/utils";
import { OnChainCalls } from "../src/classes/OnChainCalls";
import { TEST_WALLETS } from "../tests/helpers/accounts";
import { Transaction } from "../src";

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

const tx = {
    EffectsCert: {
        certificate: {
            transactionDigest: "GRS/6XCpZCegDe6asGEEcL/4WLAH9YmdI5eh3QnH40M=",
            data: {
                transactions: [
                    {
                        Call: {
                            package: {
                                objectId:
                                    "0x236b6e3c91ec25c2201b2ffbba09293d6ec797ed",
                                version: 1,
                                digest: "lLfJ/Imb8sQbBX3/kH/QujdJHJwVKIsOFWftGOexAeU="
                            },
                            module: "perpetual",
                            function: "trade",
                            arguments: [
                                "0xc364cbbb4c87f00800bd3f4cbc1b8bdacd236e98",
                                "0x72e7de3efb5695662b8108cbec45e4389ad27b18",
                                "0x71922c44ea233208724bd831206dd89aa3822c94",
                                [
                                    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                                    0
                                ],
                                "",
                                [
                                    0, 202, 154, 59, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                                    0, 0, 0
                                ],
                                [
                                    0, 202, 154, 59, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                                    0, 0, 0
                                ],
                                [
                                    0, 202, 154, 59, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                                    0, 0, 0
                                ],
                                "",
                                "0x9e61bd8cac66d89b78ebd145d6bbfbdd6ff550cf",
                                [
                                    83, 178, 228, 217, 0, 0, 0, 0, 0, 0, 0, 0,
                                    0, 0, 0, 0
                                ],
                                [
                                    36, 224, 185, 133, 132, 1, 0, 0, 0, 0, 0, 0,
                                    0, 0, 0, 0
                                ],
                                [
                                    65, 75, 114, 29, 148, 138, 78, 137, 163,
                                    118, 96, 34, 84, 9, 130, 206, 44, 60, 98,
                                    230, 255, 51, 214, 82, 179, 6, 128, 215,
                                    150, 245, 22, 96, 201, 58, 66, 254, 34, 145,
                                    231, 110, 45, 46, 143, 206, 81, 166, 62,
                                    208, 75, 12, 9, 90, 38, 235, 34, 221, 146,
                                    183, 201, 247, 66, 90, 168, 232, 247, 0
                                ],
                                [
                                    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                                    0
                                ],
                                1,
                                [
                                    0, 202, 154, 59, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                                    0, 0, 0
                                ],
                                [
                                    0, 202, 154, 59, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                                    0, 0, 0
                                ],
                                [
                                    0, 202, 154, 59, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                                    0, 0, 0
                                ],
                                "",
                                "0x9a363a0780493d20cd42dd7db9a99d3132d8f764",
                                [
                                    83, 178, 228, 217, 0, 0, 0, 0, 0, 0, 0, 0,
                                    0, 0, 0, 0
                                ],
                                [
                                    36, 224, 185, 133, 132, 1, 0, 0, 0, 0, 0, 0,
                                    0, 0, 0, 0
                                ],
                                [
                                    65, 15, 32, 174, 89, 228, 179, 77, 254, 76,
                                    36, 215, 71, 7, 131, 4, 72, 115, 20, 196,
                                    173, 142, 149, 230, 80, 160, 113, 132, 143,
                                    71, 105, 95, 22, 106, 56, 48, 60, 39, 79, 2,
                                    211, 126, 54, 243, 191, 56, 2, 55, 216, 159,
                                    255, 102, 154, 41, 245, 252, 237, 193, 150,
                                    21, 58, 209, 62, 171, 143, 1
                                ],
                                [
                                    0, 242, 5, 42, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                                    0, 0
                                ]
                            ]
                        }
                    }
                ],
                sender: "0x897a20a734140093525dde025153ed00d6d43609",
                gasPayment: {
                    objectId: "0x2edc3cc25647dc3292277d55c5b71b24483ffcf5",
                    version: 8,
                    digest: "QQM9H50kFdxNxntIH06k4AvBTVVbk9kF/cEX7Cvqq0c="
                },
                gasBudget: 10000
            },
            txSignature:
                "AdPHmVpqRQ4IjxiIZ4Ch9MALaXLmVXVwQgu9GIyPp3yOJKwhdtr2yBPOityUCbW+s/j/q553IS3xMKPt6ZWqJMEBAiilc3yaUZq5/nI68m+bY0XJvyasZGuXfPI//Hl6wfCO",
            authSignInfo: {
                epoch: 0,
                signature:
                    "i6TBj4++c/2DQmPSg6JxtZXipm20K5LPKGxlzfs5Ih8D4SYUv6erb5+Qh3Gg+deM",
                signers_map: [
                    58, 48, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 16, 0, 0, 0, 0, 0, 1,
                    0, 2, 0
                ]
            }
        },
        effects: {
            transactionEffectsDigest:
                "CDf2KzFKNlHCwk53RR+bWvMBh7U2f/7GqC5frvLR81Y=",
            effects: {
                status: {
                    status: "success"
                },
                gasUsed: {
                    computationCost: 2598,
                    storageCost: 120,
                    storageRebate: 74
                },
                sharedObjects: [
                    {
                        objectId: "0xc364cbbb4c87f00800bd3f4cbc1b8bdacd236e98",
                        version: 1,
                        digest: "qYJIqCLSfw+exL+2HSmIqG0BCcnu80SUilFWquo7G2A="
                    },
                    {
                        objectId: "0x72e7de3efb5695662b8108cbec45e4389ad27b18",
                        version: 2,
                        digest: "sjn9Mr3BOyGofDg6e2QBUmKCe94oTIfn9A+RGGMsUGU="
                    },
                    {
                        objectId: "0x71922c44ea233208724bd831206dd89aa3822c94",
                        version: 1,
                        digest: "hM/EOBQJmNVwlhmwd5RDFFsKCWwngNEJJ4Pl1WGgi10="
                    }
                ],
                transactionDigest:
                    "GRS/6XCpZCegDe6asGEEcL/4WLAH9YmdI5eh3QnH40M=",
                created: [
                    {
                        owner: {
                            ObjectOwner:
                                "0x71922c44ea233208724bd831206dd89aa3822c94"
                        },
                        reference: {
                            objectId:
                                "0x14df2c37424318aaead5b64fbcbe503d47037f52",
                            version: 1,
                            digest: "IXaRKqGwzMmZ0Y/YPCcT4Ii41CmKUvCjQABaMaZvqi8="
                        }
                    },
                    {
                        owner: {
                            ObjectOwner:
                                "0x71922c44ea233208724bd831206dd89aa3822c94"
                        },
                        reference: {
                            objectId:
                                "0x6c68192683d9208e24ef9aee20f430d16154486d",
                            version: 1,
                            digest: "fpIRIP40OgB01MGfFdbYSGHfG0QDd9d7WhMgEb0XN6g="
                        }
                    }
                ],
                mutated: [
                    {
                        owner: {
                            AddressOwner:
                                "0x897a20a734140093525dde025153ed00d6d43609"
                        },
                        reference: {
                            objectId:
                                "0x2edc3cc25647dc3292277d55c5b71b24483ffcf5",
                            version: 9,
                            digest: "KRUsPtcGCxATu7WfuTVDI+iGe2/6G2OPChWh4f0ddts="
                        }
                    },
                    {
                        owner: {
                            Shared: {
                                initial_shared_version: 1
                            }
                        },
                        reference: {
                            objectId:
                                "0x71922c44ea233208724bd831206dd89aa3822c94",
                            version: 2,
                            digest: "wC9RY6pR6+rzqIDxbaMQEdqRRbqVvba4ecd4xTfizOI="
                        }
                    },
                    {
                        owner: {
                            Shared: {
                                initial_shared_version: 1
                            }
                        },
                        reference: {
                            objectId:
                                "0x72e7de3efb5695662b8108cbec45e4389ad27b18",
                            version: 3,
                            digest: "aswZh20PgP5kOkA4/Rl5AWiKeNjSlmm2YXuGhYRUFD8="
                        }
                    },
                    {
                        owner: {
                            Shared: {
                                initial_shared_version: 1
                            }
                        },
                        reference: {
                            objectId:
                                "0xc364cbbb4c87f00800bd3f4cbc1b8bdacd236e98",
                            version: 2,
                            digest: "EjJF21hMYkq7T8xPgeDL+zyxKH90F2lzCsc2hV43PIo="
                        }
                    }
                ],
                gasObject: {
                    owner: {
                        AddressOwner:
                            "0x897a20a734140093525dde025153ed00d6d43609"
                    },
                    reference: {
                        objectId: "0x2edc3cc25647dc3292277d55c5b71b24483ffcf5",
                        version: 9,
                        digest: "KRUsPtcGCxATu7WfuTVDI+iGe2/6G2OPChWh4f0ddts="
                    }
                },
                events: [
                    {
                        coinBalanceChange: {
                            packageId:
                                "0x0000000000000000000000000000000000000002",
                            transactionModule: "gas",
                            sender: "0x897a20a734140093525dde025153ed00d6d43609",
                            changeType: "Gas",
                            owner: {
                                AddressOwner:
                                    "0x897a20a734140093525dde025153ed00d6d43609"
                            },
                            coinType: "0x2::sui::SUI",
                            coinObjectId:
                                "0x2edc3cc25647dc3292277d55c5b71b24483ffcf5",
                            version: 8,
                            amount: -2644
                        }
                    },
                    {
                        newObject: {
                            packageId:
                                "0x236b6e3c91ec25c2201b2ffbba09293d6ec797ed",
                            transactionModule: "perpetual",
                            sender: "0x897a20a734140093525dde025153ed00d6d43609",
                            recipient: {
                                ObjectOwner:
                                    "0x71922c44ea233208724bd831206dd89aa3822c94"
                            },
                            objectType:
                                "0x2::dynamic_field::Field<vector<u8>, 0x236b6e3c91ec25c2201b2ffbba09293d6ec797ed::perpetual::OrderStatus>",
                            objectId:
                                "0x14df2c37424318aaead5b64fbcbe503d47037f52",
                            version: 1
                        }
                    },
                    {
                        newObject: {
                            packageId:
                                "0x236b6e3c91ec25c2201b2ffbba09293d6ec797ed",
                            transactionModule: "perpetual",
                            sender: "0x897a20a734140093525dde025153ed00d6d43609",
                            recipient: {
                                ObjectOwner:
                                    "0x71922c44ea233208724bd831206dd89aa3822c94"
                            },
                            objectType:
                                "0x2::dynamic_field::Field<vector<u8>, 0x236b6e3c91ec25c2201b2ffbba09293d6ec797ed::perpetual::OrderStatus>",
                            objectId:
                                "0x6c68192683d9208e24ef9aee20f430d16154486d",
                            version: 1
                        }
                    },
                    {
                        mutateObject: {
                            packageId:
                                "0x236b6e3c91ec25c2201b2ffbba09293d6ec797ed",
                            transactionModule: "perpetual",
                            sender: "0x897a20a734140093525dde025153ed00d6d43609",
                            objectType:
                                "0x2::table::Table<vector<u8>, 0x236b6e3c91ec25c2201b2ffbba09293d6ec797ed::perpetual::OrderStatus>",
                            objectId:
                                "0x71922c44ea233208724bd831206dd89aa3822c94",
                            version: 2
                        }
                    },
                    {
                        mutateObject: {
                            packageId:
                                "0x236b6e3c91ec25c2201b2ffbba09293d6ec797ed",
                            transactionModule: "perpetual",
                            sender: "0x897a20a734140093525dde025153ed00d6d43609",
                            objectType: "0x2::table::Table<address, bool>",
                            objectId:
                                "0x72e7de3efb5695662b8108cbec45e4389ad27b18",
                            version: 3
                        }
                    },
                    {
                        mutateObject: {
                            packageId:
                                "0x0000000000000000000000000000000000000002",
                            transactionModule: "unused_input_object",
                            sender: "0x897a20a734140093525dde025153ed00d6d43609",
                            objectType:
                                "0x236b6e3c91ec25c2201b2ffbba09293d6ec797ed::perpetual::Perpetual",
                            objectId:
                                "0xc364cbbb4c87f00800bd3f4cbc1b8bdacd236e98",
                            version: 2
                        }
                    },
                    {
                        moveEvent: {
                            packageId:
                                "0x236b6e3c91ec25c2201b2ffbba09293d6ec797ed",
                            transactionModule: "perpetual",
                            sender: "0x897a20a734140093525dde025153ed00d6d43609",
                            type: "0x236b6e3c91ec25c2201b2ffbba09293d6ec797ed::perpetual::DebugEvent",
                            fields: {
                                extractedAddress:
                                    "poiDn9MpFybptpPl2c8tFOOnUjE=",
                                orderAddress:
                                    "0x9e61bd8cac66d89b78ebd145d6bbfbdd6ff550cf"
                            },
                            bcs: "nmG9jKxm2Jt469FF1rv73W/1UM8UpoiDn9MpFybptpPl2c8tFOOnUjE="
                        }
                    },
                    {
                        moveEvent: {
                            packageId:
                                "0x236b6e3c91ec25c2201b2ffbba09293d6ec797ed",
                            transactionModule: "perpetual",
                            sender: "0x897a20a734140093525dde025153ed00d6d43609",
                            type: "0x236b6e3c91ec25c2201b2ffbba09293d6ec797ed::perpetual::DebugEvent",
                            fields: {
                                extractedAddress:
                                    "m5k7T/CL+b2bvElmQccj//AHFyk=",
                                orderAddress:
                                    "0x9a363a0780493d20cd42dd7db9a99d3132d8f764"
                            },
                            bcs: "mjY6B4BJPSDNQt19uamdMTLY92QUm5k7T/CL+b2bvElmQccj//AHFyk="
                        }
                    }
                ],
                dependencies: [
                    "LIWzCOxYdSHGHKp1mFtizL2itITY4Vqy3tn/1sF0/Gc=",
                    "LknaYsWTRmW5EIhQv56VzPi3j9BUpxkv7g3LFNYE6II=",
                    "eGcrQTXw5I47YgH3hcx5oZQeYHFQXXgAk2GWEEicjHA="
                ]
            },
            authSignInfo: {
                epoch: 0,
                signature:
                    "qgjhoQEzm19IMraZhkz2OREJ6UxvsZDyjB1/iRbAnPsOip/0oeVb1i1tcDPN+HzU",
                signers_map: [
                    58, 48, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 16, 0, 0, 0, 1, 0, 2,
                    0, 3, 0
                ]
            }
        },
        confirmed_local_execution: true
    }
};

async function main() {
    // await requestGas("0x9a363a0780493d20cd42dd7db9a99d3132d8f764");
    // const txResponse = await onChain.createPerpetual({});
    // console.log(JSON.stringify(txResponse));
    // const obj = await onChain.getOnChainObject(
    //     "0x5aabb522d56cb5c47d66c2a7405740dd305ec9f8"
    // );
    // console.log(JSON.stringify(obj));
    // const signer = getSignerFromSeed(TEST_WALLETS[0].phrase, provider);
    // console.log(await signer.getAddress());
    // console.log(await requestGas("0x897a20a734140093525dde025153ed00d6d43609"));
    // const event = Transaction.getEvents(tx, "DebugEvent");
    // console.log(JSON.stringify(event))
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
