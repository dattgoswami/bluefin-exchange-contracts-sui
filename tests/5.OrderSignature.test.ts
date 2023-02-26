import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { OnChainCalls, OrderSigner, Transaction } from "../src/classes";
import { DeploymentConfigs } from "../src/DeploymentConfig";
import { Order } from "../src/interfaces";
import {
    getKeyPairFromSeed,
    getProvider,
    getSignerFromSeed,
    readFile
} from "../src/utils";
import { TEST_WALLETS } from "./helpers/accounts";
import { DEFAULT } from "../src/defaults";
import {
    base64ToBuffer,
    base64ToHex,
    bigNumber,
    hexToBuffer
} from "../src/library";

chai.use(chaiAsPromised);
const expect = chai.expect;

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);

const ownerKeyPair = getKeyPairFromSeed(DeploymentConfigs.deployer);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

describe("Order Signer", () => {
    let deployment = readFile(DeploymentConfigs.filePath);
    const order: Order = DEFAULT.ORDER;
    const orderSigner = new OrderSigner(ownerKeyPair);

    let onChain: OnChainCalls = new OnChainCalls(ownerSigner, deployment);

    it("should not verify hash to given address secp256k1 when signed with different key", async () => {
        const alice = getKeyPairFromSeed(TEST_WALLETS[0].phrase);
        const orderSigner = new OrderSigner(alice);

        const hash = orderSigner.getOrderHash(order);
        const signature = orderSigner.signOrder(order);
        const pubkey = ownerKeyPair.getPublicKey();

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "verify_signature",
            [
                Array.from(hexToBuffer(signature)),
                Array.from(pubkey.toBytes()),
                Array.from(hexToBuffer(hash))
            ],
            "test"
        );

        const signatureVerifiedEvent = Transaction.getEvents(
            receipt,
            "SignatureVerifiedEvent"
        )[0];

        expect(signatureVerifiedEvent).to.not.be.undefined;
        expect(signatureVerifiedEvent?.fields?.is_verified).to.be.false;
    });

    it("should verify hash to given address with secp256k1", async () => {
        const hash = orderSigner.getOrderHash(order);
        const signature = orderSigner.signOrder(order);
        const pubkey = ownerKeyPair.getPublicKey();

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "verify_signature",
            [
                Array.from(hexToBuffer(signature)),
                Array.from(pubkey.toBytes()),
                Array.from(hexToBuffer(hash))
            ],
            "test"
        );

        const signatureVerifiedEvent = Transaction.getEvents(
            receipt,
            "SignatureVerifiedEvent"
        )[0];
        expect(signatureVerifiedEvent).to.not.be.undefined;
        expect(signatureVerifiedEvent?.fields?.is_verified).to.be.true;
    });

    it("should not verify hash to given address secp256k1 when msg hash was changed", async () => {
        const orderSigner = new OrderSigner(ownerKeyPair);
        const updatedOrder: Order = { ...order, price: bigNumber(0) };
        const hash = orderSigner.getOrderHash(updatedOrder);

        const signature = await orderSigner.signOrder(order);
        const packageId = deployment.objects.package.id;
        const pubkey = await ownerKeyPair.getPublicKey();

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "verify_signature",
            [
                Array.from(hexToBuffer(signature)),
                Array.from(pubkey.toBytes()),
                Array.from(hexToBuffer(hash))
            ],
            "test"
        );

        const signatureVerifiedEvent = Transaction.getEvents(
            receipt,
            "SignatureVerifiedEvent"
        )[0];

        expect(signatureVerifiedEvent).to.not.be.undefined;
        expect(signatureVerifiedEvent?.fields?.is_verified).to.be.false;
    });

    it("should verify hash (off-chain) to given address secp256k1 by verifyUsingHash method", async () => {
        const alice = getKeyPairFromSeed(TEST_WALLETS[0].phrase);
        const orderSigner = new OrderSigner(alice);

        const hash = orderSigner.getOrderHash(order);
        const signature = orderSigner.signOrder(order);

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
        const signature = orderSigner.signOrder(order);

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
        const signature = orderSigner.signOrder(order);

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
        const signature = orderSigner.signOrder(order);

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
            DeploymentConfigs.deployer,
            "ED25519"
        );
        const orderSigner = new OrderSigner(ownerKeyPair);
        const hash = orderSigner.getOrderHash(order);
        const signature = orderSigner.signOrder(order);
        const pubkey = await ownerKeyPair.getPublicKey();

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "verify_signature",
            [
                Array.from(hexToBuffer(signature)),
                Array.from(pubkey.toBytes()),
                Array.from(hexToBuffer(hash))
            ],
            "test"
        );

        const signatureVerifiedEvent = Transaction.getEvents(
            receipt,
            "SignatureVerifiedEvent"
        )[0];

        expect(signatureVerifiedEvent).to.not.be.undefined;
        expect(signatureVerifiedEvent?.fields?.is_verified).to.be.true;
    });

    it("should not verify hash to given address ed25519", async () => {
        const alice = getKeyPairFromSeed(TEST_WALLETS[0].phrase, "ED25519");
        const ownerKeyPair = getKeyPairFromSeed(
            DeploymentConfigs.deployer,
            "ED25519"
        );
        const orderSigner = new OrderSigner(alice);

        const hash = orderSigner.getOrderHash(order);
        const signature = orderSigner.signOrder(order);
        const pubkey = await ownerKeyPair.getPublicKey();

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "verify_signature",
            [
                Array.from(hexToBuffer(signature)),
                Array.from(pubkey.toBytes()),
                Array.from(hexToBuffer(hash))
            ],
            "test"
        );

        const signatureVerifiedEvent = Transaction.getEvents(
            receipt,
            "SignatureVerifiedEvent"
        )[0];

        expect(signatureVerifiedEvent).to.not.be.undefined;
        expect(signatureVerifiedEvent?.fields?.is_verified).to.be.false;
    });

    it("should generate off-chain hash exactly equal to on-chain hash", async () => {
        const orderSigner = new OrderSigner(ownerKeyPair);
        const hash = orderSigner.getOrderHash(order);

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "hash",
            [order.maker],
            "test"
        );

        const hashGeneratedEvent = Transaction.getEvents(
            receipt,
            "HashGeneratedEvent"
        )[0];
        const orderSerializedEvent = Transaction.getEvents(
            receipt,
            "OrderSerializedEvent"
        )[0];

        expect(hashGeneratedEvent).to.not.be.undefined;
        expect(orderSerializedEvent).to.not.be.undefined;

        const onChainHash = base64ToHex(hashGeneratedEvent?.fields?.hash ?? "");

        expect(hash).to.be.equal(onChainHash);
    });

    it("should generate off-chain public address exactly equal to on-chain public address", async () => {
        const receipt = await onChain.signAndCall(
            ownerSigner,
            "get_public_address",
            [
                Array.from(
                    base64ToBuffer(ownerKeyPair.getPublicKey().toBase64())
                )
            ],
            "test"
        );

        const addressGeneratedEvent = Transaction.getEvents(
            receipt,
            "PublicAddressGeneratedEvent"
        )[0];

        expect(addressGeneratedEvent).to.not.be.undefined;

        const onChainAddress = base64ToHex(
            addressGeneratedEvent?.fields?.address ?? ""
        );

        expect(onChainAddress).to.be.equal(
            ownerKeyPair.getPublicKey().toSuiAddress()
        );
    });

    it("should generate off-chain public address exactly equal to on-chain public address", async () => {
        const receipt = await onChain.signAndCall(
            ownerSigner,
            "get_public_address",
            [
                Array.from(
                    base64ToBuffer(ownerKeyPair.getPublicKey().toBase64())
                )
            ],
            "test"
        );

        const addressGeneratedEvent = Transaction.getEvents(
            receipt,
            "PublicAddressGeneratedEvent"
        )[0];

        expect(addressGeneratedEvent).to.not.be.undefined;

        const onChainAddress = base64ToHex(
            addressGeneratedEvent?.fields?.address ?? ""
        );

        expect(onChainAddress).to.be.equal(
            ownerKeyPair.getPublicKey().toSuiAddress()
        );
    });

    it("should recover public key on-chain from signature & hash", async () => {
        const hash = orderSigner.getOrderHash(order);
        const signature = orderSigner.signOrder(order);
        const pubkey = await ownerKeyPair.getPublicKey();

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "get_public_key",
            [Array.from(hexToBuffer(signature)), Array.from(hexToBuffer(hash))],
            "test"
        );

        const pkRecoveredEvent = Transaction.getEvents(
            receipt,
            "PublicKeyRecoveredEvent"
        )[0];

        const pk = base64ToHex(pkRecoveredEvent?.fields?.public_key);

        expect(pkRecoveredEvent).to.not.be.undefined;
        expect(pk).to.be.equal(base64ToHex(pubkey.toBase64()));
    });

    it("should not recover valid public key on-chain from signature & hash", async () => {
        const signature = await orderSigner.signOrder(order);
        const updatedOrder: Order = { ...order, price: bigNumber(0) };
        const hash = orderSigner.getOrderHash(updatedOrder);
        const pubkey = await ownerKeyPair.getPublicKey();

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "get_public_key",
            [Array.from(hexToBuffer(signature)), Array.from(hexToBuffer(hash))],
            "test"
        );

        const pkRecoveredEvent = Transaction.getEvents(
            receipt,
            "PublicKeyRecoveredEvent"
        )[0];

        const pk = base64ToHex(pkRecoveredEvent?.fields?.public_key);

        expect(pkRecoveredEvent).to.not.be.undefined;
        expect(pk).to.be.not.equal(base64ToHex(pubkey.toBase64()));
    });
});
