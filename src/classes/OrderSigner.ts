import { Base64DataBuffer, Keypair, Secp256k1Keypair } from "@mysten/sui.js";
import { Order, SignedOrder } from "../interfaces/order";
import { sha256 } from "@noble/hashes/sha256";

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
}
