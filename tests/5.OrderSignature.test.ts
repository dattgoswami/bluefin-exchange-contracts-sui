import {
    OnChainCalls,
    OrderSigner,
    Transaction,
    createOrder,
    getKeyPairFromSeed,
    getProvider,
    getSignerFromSeed,
    readFile,
    DeploymentConfigs,
    Order,
    getTestAccounts,
    TEST_WALLETS,
    base64ToBuffer,
    base64ToHex,
    bigNumber,
    encodeOrderFlags,
    hexStrToUint8,
    base64ToUint8
} from "../submodules/library-sui";
import { DEFAULT } from "../submodules/library-sui/src/defaults";
import { expect, expectTxToSucceed } from "./helpers";
import { fromSerializedSignature } from "@mysten/sui.js";

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);

const ownerKeyPair = getKeyPairFromSeed(DeploymentConfigs.deployer);
const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);
const ed25519Phrase =
    "milk fit tape notable input seek circle define deny rally camera sorry";
const ed25519Keypair = getKeyPairFromSeed(ed25519Phrase, "ED25519");

describe("Order Signer", () => {
    const deployment = readFile(DeploymentConfigs.filePath);
    const order: Order = DEFAULT.ORDER;
    const orderSigner = new OrderSigner(ownerKeyPair);

    const onChain: OnChainCalls = new OnChainCalls(ownerSigner, deployment);

    xit("should verify ui wallet signature on-chain and recover user public address", async () => {
        const signerAddress =
            "0x248f1c95a231a068dfc7ddfaa492190284d9608d6ca8abf98503345157d9c826";

        const uiData = {
            messageBytes: "f2QxZzmXq9/QJtmmbk+kvaHpFhgWNtBps6HKeT9sxSU=",
            signature:
                "ALSak8MIEzlEgrG2vGxFNNNuV3OpUHwohV5weo6Bm422TXQvJ6FGq7GYG01GXTEfmO/s1ogN993IzIVOUuSfvQMq3XRi9gtN0vRnK6rISvD0CcnlC3m43EiPVlMzPa6sIQ=="
        };

        const sigPK = fromSerializedSignature(uiData.signature);
        const signature = Buffer.from(sigPK.signature).toString("hex") + "2";

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "get_public_address_from_signed_order",
            [
                order.market,
                order.maker,
                encodeOrderFlags(order),
                order.price,
                order.quantity,
                order.leverage,
                order.expiration,
                order.salt,
                Array.from(hexStrToUint8(signature)),
                Array.from(sigPK.pubKey.toBytes())
            ],
            "test"
        );

        expectTxToSucceed(receipt);

        const addressGeneratedEvent = Transaction.getEvents(
            receipt,
            "PublicAddressGeneratedEvent"
        )[0];

        const onChainAddress = base64ToHex(addressGeneratedEvent?.addr ?? "");

        expect(onChainAddress).to.be.equal(signerAddress.substring(2));
    });

    xit("should verify ui wallet signature off-chain", async () => {
        const uiData = {
            messageBytes: "f2QxZzmXq9/QJtmmbk+kvaHpFhgWNtBps6HKeT9sxSU=",
            signature:
                "ALSak8MIEzlEgrG2vGxFNNNuV3OpUHwohV5weo6Bm422TXQvJ6FGq7GYG01GXTEfmO/s1ogN993IzIVOUuSfvQMq3XRi9gtN0vRnK6rISvD0CcnlC3m43EiPVlMzPa6sIQ=="
        };

        const sigPK = fromSerializedSignature(uiData.signature);

        const strSig = Buffer.from(sigPK.signature).toString("hex") + "2";

        expect(
            OrderSigner.verifySignatureUsingOrder(
                order,
                strSig,
                sigPK.pubKey.toString()
            )
        ).to.be.true;
    });

    it("should verify ed25519 signature when sig, pk and msg data are correct", async () => {
        const serializedOrder = OrderSigner.getSerializedOrder(order);

        const public_key_base64 = ed25519Keypair.getPublicKey().toString();
        const signature = orderSigner.signOrder(
            order,
            ed25519Keypair
        ).signature;

        // off-chain verification
        expect(
            OrderSigner.verifySignatureUsingOrder(
                order,
                signature,
                public_key_base64
            )
        ).to.be.true;

        // on-chain verification
        const receipt = await onChain.signAndCall(
            ownerSigner,
            "verify_signature",
            [
                Array.from(hexStrToUint8(signature)),
                Array.from(base64ToUint8(public_key_base64)),
                serializedOrder
            ],
            "test"
        );

        const signatureVerifiedEvent = Transaction.getEvents(
            receipt,
            "SignatureVerifiedEvent"
        )[0];

        expect(signatureVerifiedEvent).to.not.be.undefined;
        expect(signatureVerifiedEvent?.is_verified).to.be.true;
    });

    it("should verify secp256k1 signature when sig, pk and msg data are correct", async () => {
        const serializedOrder = OrderSigner.getSerializedOrder(order);
        const signature = orderSigner.signOrder(order, ownerKeyPair).signature;

        const public_key_base64 = ownerKeyPair.getPublicKey().toString();

        // off-chain signature verification
        expect(
            OrderSigner.verifySignatureUsingOrder(
                order,
                signature,
                public_key_base64
            )
        ).to.be.true;

        // on-chain signature verification
        const receipt = await onChain.signAndCall(
            ownerSigner,
            "verify_signature",
            [
                Array.from(hexStrToUint8(signature)),
                Array.from(ownerKeyPair.getPublicKey().toBytes()),
                serializedOrder
            ],
            "test"
        );

        const signatureVerifiedEvent = Transaction.getEvents(
            receipt,
            "SignatureVerifiedEvent"
        )[0];

        expect(signatureVerifiedEvent).to.not.be.undefined;
        expect(signatureVerifiedEvent?.is_verified).to.be.true;
    });

    it("should not verify hash to given address secp256k1 when signed with different key", async () => {
        const alice = getKeyPairFromSeed(TEST_WALLETS[0].phrase);

        const serializedOrder = OrderSigner.getSerializedOrder(order);

        // signing using alice's key
        const signature = orderSigner.signOrder(order, alice).signature;

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "verify_signature",
            [
                Array.from(hexStrToUint8(signature)), // signed using alice pvt key
                Array.from(ownerKeyPair.getPublicKey().toBytes()), // passing owner public key
                serializedOrder
            ],
            "test"
        );

        const signatureVerifiedEvent = Transaction.getEvents(
            receipt,
            "SignatureVerifiedEvent"
        )[0];

        expect(signatureVerifiedEvent).to.not.be.undefined;
        expect(signatureVerifiedEvent?.is_verified).to.be.false;
    });

    it("should not verify signature when msg was changed - secp256", async () => {
        const updatedOrder: Order = { ...order, price: bigNumber(0) };
        const serializedOrder = OrderSigner.getSerializedOrder(updatedOrder);

        // signing a different order
        const signature = await orderSigner.signOrder(order, ownerKeyPair)
            .signature;

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "verify_signature",
            [
                Array.from(hexStrToUint8(signature)),
                Array.from(ownerKeyPair.getPublicKey().toBytes()),
                serializedOrder // passing in a different order
            ],
            "test"
        );

        const signatureVerifiedEvent = Transaction.getEvents(
            receipt,
            "SignatureVerifiedEvent"
        )[0];

        expect(signatureVerifiedEvent).to.not.be.undefined;
        expect(signatureVerifiedEvent?.is_verified).to.be.false;
    });

    it("should not verify signature when msg was changed - ed25519", async () => {
        const updatedOrder: Order = { ...order, price: bigNumber(0) };
        const serializedOrder = OrderSigner.getSerializedOrder(updatedOrder);

        // signing a different order
        const signature = await orderSigner.signOrder(order, ed25519Keypair)
            .signature;

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "verify_signature",
            [
                Array.from(hexStrToUint8(signature)),
                Array.from(ownerKeyPair.getPublicKey().toBytes()),
                // passing in a different order
                serializedOrder
            ],
            "test"
        );

        const signatureVerifiedEvent = Transaction.getEvents(
            receipt,
            "SignatureVerifiedEvent"
        )[0];

        expect(signatureVerifiedEvent).to.not.be.undefined;
        expect(signatureVerifiedEvent?.is_verified).to.be.false;
    });

    it("should verify signature off-chain using order - secp256k1", async () => {
        const alice = getKeyPairFromSeed(TEST_WALLETS[0].phrase);
        const signature = orderSigner.signOrder(order, alice).signature;
        const public_key_base64 = alice.getPublicKey().toString();

        expect(
            OrderSigner.verifySignatureUsingOrder(
                order,
                signature,
                public_key_base64
            )
        ).to.be.true;
    });

    it("should verify signature off-chain using order - ed25519", async () => {
        const signature = orderSigner.signOrder(
            order,
            ed25519Keypair
        ).signature;
        const public_key_base64 = ed25519Keypair.getPublicKey().toString();

        expect(
            OrderSigner.verifySignatureUsingOrder(
                order,
                signature,
                public_key_base64
            )
        ).to.be.true;
    });

    it("should revert when verifying signature using order as public key is incorrect", async () => {
        expect(
            OrderSigner.verifySignatureUsingOrder(
                order,
                orderSigner.signOrder(order, ownerKeyPair).signature,
                ed25519Keypair.getPublicKey().toString()
            )
        ).to.be.false;

        expect(
            OrderSigner.verifySignatureUsingOrder(
                order,
                orderSigner.signOrder(order, ed25519Keypair).signature,
                ownerKeyPair.getPublicKey().toString()
            )
        ).to.be.false;
    });

    it("should revert when verifying signature using order as order is incorrect", async () => {
        const [alice] = getTestAccounts(provider);

        expect(
            OrderSigner.verifySignatureUsingOrder(
                { ...order, maker: alice.address },
                orderSigner.signOrder(order, ownerKeyPair).signature,
                ownerKeyPair.getPublicKey().toString()
            )
        ).to.be.false;

        expect(
            OrderSigner.verifySignatureUsingOrder(
                { ...order, maker: alice.address },
                orderSigner.signOrder(order, ed25519Keypair).signature,
                ed25519Keypair.getPublicKey().toString()
            )
        ).to.be.false;
    });

    it("should generate off-chain hash exactly equal to on-chain hash", async () => {
        const hash = OrderSigner.getOrderHash(order);

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "hash",
            [order.maker, order.market],
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

        const onChainHash = base64ToHex(hashGeneratedEvent?.hash ?? "");
        expect(hash).to.be.equal(onChainHash);
    });

    it("should recover user address from signed order - secp256k", async () => {
        const [alice] = getTestAccounts(provider);

        const order = createOrder({
            isBuy: true,
            maker: alice.address,
            market: onChain.getPerpetualID()
        });

        const hash = OrderSigner.getOrderHash(order);

        const serializedOrder = OrderSigner.getSerializedOrder(order);
        const signature = orderSigner.signOrder(order, alice.keyPair).signature;

        expect(
            OrderSigner.verifySignatureUsingOrder(
                order,
                signature,
                alice.keyPair.getPublicKey().toString()
            )
        ).to.be.true;

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "get_public_address_from_signed_order",
            [
                order.market,
                order.maker,
                encodeOrderFlags(order),
                order.price,
                order.quantity,
                order.leverage,
                order.expiration,
                order.salt,
                Array.from(hexStrToUint8(signature)),
                Array.from(alice.keyPair.getPublicKey().toBytes())
            ],
            "test"
        );

        expectTxToSucceed(receipt);

        const hashGeneratedEvent = Transaction.getEvents(
            receipt,
            "HashGeneratedEvent"
        )[0];

        const orderSerializedEvent = Transaction.getEvents(
            receipt,
            "OrderSerializedEvent"
        )[0];

        const enocdedOrderEvent = Transaction.getEvents(
            receipt,
            "EncodedOrder"
        )[0];

        const addressGeneratedEvent = Transaction.getEvents(
            receipt,
            "PublicAddressGeneratedEvent"
        )[0];

        expect(hashGeneratedEvent).to.not.be.undefined;
        expect(orderSerializedEvent).to.not.be.undefined;
        expect(addressGeneratedEvent).to.not.be.undefined;

        expect(
            Buffer.from(orderSerializedEvent.serialized_order).toString("hex")
        ).to.be.equal(serializedOrder);

        expect(base64ToHex(hashGeneratedEvent?.hash ?? "")).to.be.equal(hash);

        expect(Buffer.from(enocdedOrderEvent.order).toString()).to.be.equal(
            serializedOrder
        );

        const onChainAddress = base64ToHex(addressGeneratedEvent?.addr ?? "");

        expect(onChainAddress).to.be.equal(alice.address.substring(2));
    });

    it("should recover user address from signed order - ed25519", async () => {
        const address = ed25519Keypair.getPublicKey().toSuiAddress();
        const order = createOrder({
            isBuy: true,
            maker: address,
            market: onChain.getPerpetualID()
        });

        const hash = OrderSigner.getOrderHash(order);

        const serializedOrder = OrderSigner.getSerializedOrder(order);
        const signature = orderSigner.signOrder(
            order,
            ed25519Keypair
        ).signature;

        expect(
            OrderSigner.verifySignatureUsingOrder(
                order,
                signature,
                ed25519Keypair.getPublicKey().toString()
            )
        ).to.be.true;

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "get_public_address_from_signed_order",
            [
                order.market,
                order.maker,
                encodeOrderFlags(order),
                order.price,
                order.quantity,
                order.leverage,
                order.expiration,
                order.salt,
                Array.from(hexStrToUint8(signature)),
                Array.from(ed25519Keypair.getPublicKey().toBytes())
            ],
            "test"
        );

        expectTxToSucceed(receipt);

        const hashGeneratedEvent = Transaction.getEvents(
            receipt,
            "HashGeneratedEvent"
        )[0];

        const orderSerializedEvent = Transaction.getEvents(
            receipt,
            "OrderSerializedEvent"
        )[0];

        const enocdedOrderEvent = Transaction.getEvents(
            receipt,
            "EncodedOrder"
        )[0];

        const addressGeneratedEvent = Transaction.getEvents(
            receipt,
            "PublicAddressGeneratedEvent"
        )[0];

        expect(hashGeneratedEvent).to.not.be.undefined;
        expect(orderSerializedEvent).to.not.be.undefined;
        expect(addressGeneratedEvent).to.not.be.undefined;

        expect(
            Buffer.from(orderSerializedEvent.serialized_order).toString("hex")
        ).to.be.equal(serializedOrder);

        expect(base64ToHex(hashGeneratedEvent?.hash ?? "")).to.be.equal(hash);

        expect(Buffer.from(enocdedOrderEvent.order).toString()).to.be.equal(
            serializedOrder
        );

        const onChainAddress = base64ToHex(addressGeneratedEvent?.addr ?? "");

        expect(onChainAddress).to.be.equal(address.substring(2));
    });

    it("should generate off-chain public address exactly equal to on-chain public address - secp", async () => {
        // append 1 to public key
        const publicKey = Array.from(
            base64ToBuffer(ownerKeyPair.getPublicKey().toBase64())
        );
        publicKey.splice(0, 0, 1);

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "get_public_address",
            [publicKey],
            "test"
        );

        const addressGeneratedEvent = Transaction.getEvents(
            receipt,
            "PublicAddressGeneratedEvent"
        )[0];

        expect(addressGeneratedEvent).to.not.be.undefined;

        const onChainAddress = base64ToHex(addressGeneratedEvent?.addr ?? "");

        expect(onChainAddress).to.be.equal(
            ownerKeyPair.getPublicKey().toSuiAddress().substring(2)
        );
    });

    it("should generate off-chain public address exactly equal to on-chain public address - ed25519", async () => {
        // append 0 to public key
        const publicKey = Array.from(
            base64ToBuffer(ed25519Keypair.getPublicKey().toBase64())
        );
        publicKey.splice(0, 0, 0);

        const receipt = await onChain.signAndCall(
            ownerSigner,
            "get_public_address",
            [publicKey],
            "test"
        );

        const tempEvents = Transaction.getEvents(receipt, "TempEvent");

        tempEvents.forEach((e) => {
            console.log("Buff raw:", e);
        });

        const addressGeneratedEvent = Transaction.getEvents(
            receipt,
            "PublicAddressGeneratedEvent"
        )[0];

        expect(addressGeneratedEvent).to.not.be.undefined;

        const onChainAddress = base64ToHex(addressGeneratedEvent?.addr ?? "");

        expect(onChainAddress).to.be.equal(
            ed25519Keypair.getPublicKey().toSuiAddress().substring(2)
        );
    });
});
