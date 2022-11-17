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
import { base64ToBuffer, base64ToHex, hexToBuffer } from "../src/library";

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
                Array.from(hexToBuffer(signature)),
                Array.from(pubkey.toBuffer()),
                Array.from(hexToBuffer(hash))
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
                Array.from(hexToBuffer(signature)),
                Array.from(pubkey.toBuffer()),
                Array.from(hexToBuffer(hash))
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
                Array.from(hexToBuffer(signature)),
                Array.from(pubkey.toBuffer()),
                Array.from(hexToBuffer(hash))
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
                Array.from(hexToBuffer(signature)),
                Array.from(pubkey.toBuffer()),
                Array.from(hexToBuffer(hash))
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

    it("should generate off-chain hash exactly equal to on-chain hash", async () => {
        const orderSigner = new OrderSigner(ownerKeyPair);
        const hash = orderSigner.getOrderHash(order);

        const packageId = deployment.objects.package.id;

        const receipt = await ownerSigner.executeMoveCallWithRequestType({
            packageObjectId: packageId,
            module: "test",
            function: "hash",
            typeArguments: [],
            arguments: [],
            gasBudget: 1000
        });

        const hashGeneratedEvent = Transaction.getEvents(receipt)?.filter(
            (x) => x["moveEvent"]?.type?.indexOf("HashGeneratedEvent") >= 0
        )[0];
        const orderSerializedEvent = Transaction.getEvents(receipt)?.filter(
            (x) => x["moveEvent"]?.type?.indexOf("OrderSerializedEvent") >= 0
        )[0];

        expect(hashGeneratedEvent).to.not.be.undefined;
        expect(orderSerializedEvent).to.not.be.undefined;

        const onChainHash = Buffer.from(
            hashGeneratedEvent?.moveEvent?.fields?.hash ?? "",
            "base64"
        ).toString("hex");

        expect(hash).to.be.equal(onChainHash);
    });

    it("should generate off-chain public address exactly equal to on-chain public address", async () => {
        const packageId = deployment.objects.package.id;

        const receipt = await ownerSigner.executeMoveCallWithRequestType({
            packageObjectId: packageId,
            module: "test",
            function: "getPublicAddress",
            typeArguments: [],
            arguments: [
                Array.from(
                    base64ToBuffer(ownerKeyPair.getPublicKey().toBase64())
                )
            ],
            gasBudget: 1000
        });

        const addressGeneratedEvent = Transaction.getEvents(receipt)?.filter(
            (x) =>
                x["moveEvent"]?.type?.indexOf("PublicAddressGeneratedEvent") >=
                0
        )[0];

        expect(addressGeneratedEvent).to.not.be.undefined;

        const onChainAddress = base64ToHex(
            addressGeneratedEvent?.moveEvent?.fields?.address ?? ""
        );

        expect(onChainAddress).to.be.equal(
            ownerKeyPair.getPublicKey().toSuiAddress()
        );
    });
});
