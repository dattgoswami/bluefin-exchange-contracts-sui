import {
    Base64DataBuffer,
    Keypair,
    Secp256k1Keypair,
    Secp256k1PublicKey
} from "@mysten/sui.js";
import { Order, SignedOrder } from "../interfaces/order";
import { sha256 } from "@noble/hashes/sha256";
import { recoverPublicKey } from "@noble/secp256k1";
import { bnToHex, hexToBuffer } from "../library";

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
        return (
            "0x" +
            Buffer.from(
                this.keypair
                    .signData(
                        new Base64DataBuffer(
                            hexToBuffer(this.getSerializedOrder(order))
                        )
                    )
                    .getData()
            ).toString("hex")
        );
    }

    public getSerializedOrder(order: Order): string {
        const buffer = Buffer.alloc(118);

        const {
            price,
            quantity,
            leverage,
            expiration,
            salt,
            triggerPrice,
            maker,
            reduceOnly,
            isBuy
        } = order;

        const priceB = hexToBuffer(bnToHex(price));
        const quantityB = hexToBuffer(bnToHex(quantity));
        const leverageB = hexToBuffer(bnToHex(leverage));
        const expirationB = hexToBuffer(bnToHex(expiration));
        const saltB = hexToBuffer(bnToHex(salt));
        const triggerPriceB = hexToBuffer(bnToHex(triggerPrice));
        const makerB = hexToBuffer(maker.substring(2, 42)); // 20 bytes address 40 hex chars

        buffer.set(priceB, 0);
        buffer.set(quantityB, 16);
        buffer.set(leverageB, 32);
        buffer.set(expirationB, 48);
        buffer.set(saltB, 64);
        buffer.set(triggerPriceB, 80);
        buffer.set(makerB, 96);
        buffer.set([reduceOnly ? 1 : 0], 116);
        buffer.set([isBuy ? 1 : 0], 117);

        return "0x" + buffer.toString("hex");
    }

    public getOrderHash(order: Order): string {
        const serializedOrder = this.getSerializedOrder(order);
        const hash = sha256(hexToBuffer(serializedOrder));
        return "0x" + Buffer.from(hash).toString("hex");
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
