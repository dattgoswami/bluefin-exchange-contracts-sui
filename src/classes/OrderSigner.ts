import { Keypair, Secp256k1PublicKey } from "@mysten/sui.js";
import { Order, SignedOrder } from "../interfaces/order";
import { bnToHex, hexToBuffer } from "../library";
import * as secp from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { secp256k1 } from "@noble/curves/secp256k1";

export class OrderSigner {
    constructor(private keypair: Keypair) {}

    public getSignedOrder(order: Order): SignedOrder {
        const typedSignature = this.signOrder(order);
        return {
            ...order,
            typedSignature
        };
    }

    private signOrderOverride(data: Uint8Array): [Uint8Array, number] {
        const msgHash = sha256(data);
        const sig = secp256k1.sign(msgHash, (this as any).keypair.secretKey, {
            lowS: true
        });

        return [sig.toCompactRawBytes(), sig.recovery || 0];
    }

    signOrder(order: Order, keypair?: Keypair): string {
        const signer = keypair || this.keypair;

        const [sign, recovery] = this.signOrderOverride.call(
            signer,
            new TextEncoder().encode(this.getSerializedOrder(order))
        );

        // appending 00 at the end of the signature to make it possible
        // to recovere signer address. When verifying signature remove the leading `00`
        // append 01 when using keccak
        return (
            Buffer.from(sign).toString("hex") +
            recovery.toString().padStart(2, "0")
        );
    }

    public getSerializedOrder(order: Order): string {
        const buffer = Buffer.alloc(154);
        buffer.set(hexToBuffer(bnToHex(order.price)), 0);
        buffer.set(hexToBuffer(bnToHex(order.quantity)), 16);
        buffer.set(hexToBuffer(bnToHex(order.leverage)), 32);
        buffer.set(hexToBuffer(bnToHex(order.expiration)), 48);
        buffer.set(hexToBuffer(bnToHex(order.salt)), 64);
        buffer.set(hexToBuffer(order.maker), 80);
        buffer.set(hexToBuffer(order.market), 112);
        buffer.set([order.reduceOnly ? 1 : 0], 144);
        buffer.set([order.isBuy ? 1 : 0], 145);
        buffer.set([order.postOnly ? 1 : 0], 146);
        buffer.set(Buffer.from("Bluefin", "utf8"), 147);
        return buffer.toString("hex");
    }

    public getOrderHash(order: Order | string): string {
        // if serialized order is not provided
        if (typeof order !== "string") {
            order = this.getSerializedOrder(order);
        }

        const hash = sha256(hexToBuffer(order));
        return Buffer.from(hash).toString("hex");
    }

    public verifyUsingHash(
        signature: string,
        orderHash: string,
        address: string
    ) {
        const signatureWithR = hexToBuffer(signature);
        if (signatureWithR.length == 65) {
            const sig = signatureWithR.subarray(0, 64);
            const rByte = signatureWithR[64];
            const hash = hexToBuffer(orderHash);

            const publicKey = secp.recoverPublicKey(hash, sig, rByte, true);

            const secp256k1PK = new Secp256k1PublicKey(publicKey);

            return secp256k1PK.toSuiAddress() === address;
        }
        return false;
    }

    public verifyUsingOrder(signature: string, order: Order, address: string) {
        return this.verifyUsingHash(
            signature,
            this.getOrderHash(order),
            address
        );
    }
}
