import {
    Base64DataBuffer,
    Keypair,
    Secp256k1Keypair,
    Secp256k1PublicKey
} from "@mysten/sui.js";
import { Order, SignedOrder } from "../interfaces/order";
import { sha256 } from "@noble/hashes/sha256";
import { recoverPublicKey } from "@noble/secp256k1";

export class OrderSigner {
    constructor(private keypair: Keypair) {}

    public async getSignedOrder(order: Order): Promise<SignedOrder> {
        const typedSignature = await this.signOrder(order);
        return {
            ...order,
            typedSignature
        };
    }

    async signOrder(order: Order): Promise<string> {
        return Buffer.from(
            this.keypair
                .signData(
                    new Base64DataBuffer(
                        Buffer.from(
                            this.keypair instanceof Secp256k1Keypair
                                ? this.getSerializedOrder(order)
                                : this.getOrderHash(order)
                        )
                    )
                )
                .getData()
        ).toString("hex");
    }

    private getSerializedOrder(order: Order): string {
        const {
            expiration,
            isBuy,
            leverage,
            maker,
            price,
            quantity,
            reduceOnly,
            salt,
            triggerPrice
        } = order;

        return JSON.stringify({
            maker,
            price,
            quantity,
            isBuy,
            leverage,
            salt,
            triggerPrice,
            reduceOnly,
            expiration
        });
    }

    public getOrderHash(order: Order): string {
        const serializedOrder = this.getSerializedOrder(order);
        const hash = sha256(serializedOrder);
        return Buffer.from(hash).toString("hex");
    }

    public verifyUsingHash(
        signature: string,
        orderHash: string,
        address: string
    ) {
        const signatureWithR = Buffer.from(signature, "hex");
        if (signatureWithR.length == 65) {
            const sig = signatureWithR.subarray(0, 64);
            const rByte = signatureWithR[64];
            const hash = Buffer.from(orderHash, "hex");

            const publicKey = recoverPublicKey(hash, sig, rByte, true);

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
