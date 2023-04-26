import { Keypair, Secp256k1PublicKey } from "@mysten/sui.js";
import { Order, SignedOrder } from "../interfaces/order";
import { bnToHex, hexToBuffer } from "../library";
import * as secp from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";

export class OrderSigner {
    constructor(private keypair: Keypair) {}

    public getSignedOrder(order: Order): SignedOrder {
        const typedSignature = this.signOrder(order);
        return {
            ...order,
            typedSignature
        };
    }

    signOrder(order: Order, keypair?: Keypair): string {
        const signer = keypair || this.keypair;

        return Buffer.from(
            signer.signData(hexToBuffer(this.getSerializedOrder(order)), true)
        ).toString("hex");
    }

    public getSerializedOrder(order: Order): string {
        const buffer = Buffer.alloc(123);
        buffer.set(hexToBuffer(bnToHex(order.price)), 0);
        buffer.set(hexToBuffer(bnToHex(order.quantity)), 16);
        buffer.set(hexToBuffer(bnToHex(order.leverage)), 32);
        buffer.set(hexToBuffer(bnToHex(order.expiration)), 48);
        buffer.set(hexToBuffer(bnToHex(order.salt)), 64);
        buffer.set(hexToBuffer(order.maker), 80);
        buffer.set(hexToBuffer(order.market), 100);
        buffer.set([order.reduceOnly ? 1 : 0], 120);
        buffer.set([order.isBuy ? 1 : 0], 121);
        buffer.set([order.postOnly ? 1 : 0], 122);

        return buffer.toString("hex");
    }

    public getOrderHash(order: Order): string {
        const serializedOrder = this.getSerializedOrder(order);
        const hash = sha256(hexToBuffer(serializedOrder));
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
