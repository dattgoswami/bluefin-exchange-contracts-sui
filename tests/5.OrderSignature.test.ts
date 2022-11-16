import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { OrderSigner, Transaction } from "../src/classes";
import { DeploymentConfig } from "../src/DeploymentConfig";
import { Order } from "../src/interfaces";
import {
    getKeyPairFromSeed,
    getProvider,
    getSignerFromSeed,
    readFile
} from "../src/utils";
import { TEST_WALLETS } from "./helpers/accounts";
import { defaultOrder } from "../src/utils";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfig.rpcURL,
    DeploymentConfig.faucetURL
);

const ownerKeyPair = getKeyPairFromSeed(DeploymentConfig.deployer);
const ownerSigner = getSignerFromSeed(DeploymentConfig.deployer, provider);

describe("Order Signer", () => {
    let deployment = readFile(DeploymentConfig.filePath);
    const order: Order = defaultOrder;
    const orderSigner = new OrderSigner(ownerKeyPair);

    it("should verify hash to given address with secp256k1", async () => {
        const hash = orderSigner.getOrderHash(order);
        const signature = await orderSigner.signOrder(order);
        const packageId = deployment.objects.package.id;
        const pubkey = await ownerKeyPair.getPublicKey();

        const receipt = await ownerSigner.executeMoveCallWithRequestType({
            packageObjectId: packageId,
            module: "test",
            function: "verifySignature",
            typeArguments: [],
            arguments: [
                Array.from(Buffer.from(signature, "hex")),
                Array.from(pubkey.toBuffer()),
                Array.from(Buffer.from(hash, "hex"))
            ],
            gasBudget: 1000
        });

        const signatureVerifiedEvent = Transaction.getEvents(receipt)?.filter(
            (x) => x["moveEvent"]?.type?.indexOf("SignatureVerifiedEvent")
        )[0];

        expect(signatureVerifiedEvent).to.not.be.undefined;
        expect(signatureVerifiedEvent?.moveEvent?.fields?.is_verified).to.be
            .true;
    });

    it("should not verify hash to given address secp256k1", async () => {
        const alice = getKeyPairFromSeed(TEST_WALLETS[0].phrase);
        const orderSigner = new OrderSigner(alice);

        const hash = orderSigner.getOrderHash(order);
        const signature = await orderSigner.signOrder(order);
        const packageId = deployment.objects.package.id;
        const pubkey = await ownerKeyPair.getPublicKey();

        const receipt = await ownerSigner.executeMoveCallWithRequestType({
            packageObjectId: packageId,
            module: "test",
            function: "verifySignature",
            typeArguments: [],
            arguments: [
                Array.from(Buffer.from(signature, "hex")),
                Array.from(pubkey.toBuffer()),
                Array.from(Buffer.from(hash, "hex"))
            ],
            gasBudget: 1000
        });

        const signatureVerifiedEvent = Transaction.getEvents(receipt)?.filter(
            (x) => x["moveEvent"]?.type?.indexOf("SignatureVerifiedEvent")
        )[0];

        expect(signatureVerifiedEvent).to.not.be.undefined;
        expect(signatureVerifiedEvent?.moveEvent?.fields?.is_verified).to.be
            .false;
    });

    it("should verify hash (off-chain) to given address secp256k1 by verifyUsingHash method", async () => {
        const alice = getKeyPairFromSeed(TEST_WALLETS[0].phrase);
        const orderSigner = new OrderSigner(alice);

        const hash = orderSigner.getOrderHash(order);
        const signature = await orderSigner.signOrder(order);

        expect(
            orderSigner.verifyUsingHash(
                signature,
                hash,
                alice.getPublicKey().toSuiAddress()
            )
        ).to.be.true;
    });

    it("should not verify hash (off-chain) to given address secp256k1 by verifyUsingHash method", async () => {
        const alice = getKeyPairFromSeed(TEST_WALLETS[0].phrase);
        const orderSigner = new OrderSigner(alice);

        const hash = orderSigner.getOrderHash(order);
        const signature = await orderSigner.signOrder(order);

        expect(
            orderSigner.verifyUsingHash(
                signature,
                hash,
                ownerKeyPair.getPublicKey().toSuiAddress()
            )
        ).to.be.false;
    });

    it("should verify hash (off-chain) to given address secp256k1 by verifyUsingOrder method", async () => {
        const alice = getKeyPairFromSeed(TEST_WALLETS[0].phrase);
        const orderSigner = new OrderSigner(alice);

        const hash = orderSigner.getOrderHash(order);
        const signature = await orderSigner.signOrder(order);

        expect(
            orderSigner.verifyUsingOrder(
                signature,
                order,
                alice.getPublicKey().toSuiAddress()
            )
        ).to.be.true;
    });

    it("should not verify hash (off-chain) to given address secp256k1 by verifyUsingOrder method", async () => {
        const alice = getKeyPairFromSeed(TEST_WALLETS[0].phrase);
        const orderSigner = new OrderSigner(alice);

        const hash = orderSigner.getOrderHash(order);
        const signature = await orderSigner.signOrder(order);

        expect(
            orderSigner.verifyUsingOrder(
                signature,
                order,
                ownerKeyPair.getPublicKey().toSuiAddress()
            )
        ).to.be.false;
    });

    xit("should verify hash to given address with ed25519", async () => {
        const ownerKeyPair = getKeyPairFromSeed(
            DeploymentConfig.deployer,
            "ED25519"
        );
        const orderSigner = new OrderSigner(ownerKeyPair);
        const hash = orderSigner.getOrderHash(order);
        const signature = await orderSigner.signOrder(order);
        const packageId = deployment.objects.package.id;
        const pubkey = await ownerKeyPair.getPublicKey();

        const receipt = await ownerSigner.executeMoveCallWithRequestType({
            packageObjectId: packageId,
            module: "test",
            function: "verifySignature",
            typeArguments: [],
            arguments: [
                Array.from(Buffer.from(signature, "hex")),
                Array.from(pubkey.toBuffer()),
                Array.from(Buffer.from(hash, "hex"))
            ],
            gasBudget: 1000
        });

        // console.log(Array.from(Buffer.from(hash, "hex")));
        // console.log(Array.from(Buffer.from(signature, "hex")));

        // console.log(JSON.stringify(receipt,undefined,' '));

        const signatureVerifiedEvent = Transaction.getEvents(receipt)?.filter(
            (x) => x["moveEvent"]?.type?.indexOf("SignatureVerifiedEvent")
        )[0];

        expect(signatureVerifiedEvent).to.not.be.undefined;
        expect(signatureVerifiedEvent?.moveEvent?.fields?.is_verified).to.be
            .true;
    });

    it("should not verify hash to given address ed25519", async () => {
        const alice = getKeyPairFromSeed(TEST_WALLETS[0].phrase, "ED25519");
        const ownerKeyPair = getKeyPairFromSeed(
            DeploymentConfig.deployer,
            "ED25519"
        );
        const orderSigner = new OrderSigner(alice);

        const hash = orderSigner.getOrderHash(order);
        const signature = await orderSigner.signOrder(order);
        const packageId = deployment.objects.package.id;
        const pubkey = await ownerKeyPair.getPublicKey();

        const receipt = await ownerSigner.executeMoveCallWithRequestType({
            packageObjectId: packageId,
            module: "test",
            function: "verifySignature",
            typeArguments: [],
            arguments: [
                Array.from(Buffer.from(signature, "hex")),
                Array.from(pubkey.toBuffer()),
                Array.from(Buffer.from(hash, "hex"))
            ],
            gasBudget: 1000
        });

        const signatureVerifiedEvent = Transaction.getEvents(receipt)?.filter(
            (x) => x["moveEvent"]?.type?.indexOf("SignatureVerifiedEvent")
        )[0];

        expect(signatureVerifiedEvent).to.not.be.undefined;
        expect(signatureVerifiedEvent?.moveEvent?.fields?.is_verified).to.be
            .false;
    });
});
