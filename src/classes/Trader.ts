import { JsonRpcProvider, Keypair } from "@mysten/sui.js";
import BigNumber from "bignumber.js";
import { Order } from "../interfaces";
import { getSignerFromKeyPair } from "../utils";
import { OrderSigner } from "./OrderSigner";

export class Trader {
    static async setupNormalTrade(
        provider: JsonRpcProvider,
        orderSigner: OrderSigner,
        maker: Keypair,
        taker: Keypair,
        makerOrder: Order,
        options?: {
            takerOrder?: Order;
            quantity?: BigNumber;
            price?: BigNumber;
        }
    ) {
        const takerAddress = await getSignerFromKeyPair(
            taker,
            provider
        ).getAddress();

        const takerOrder = options?.takerOrder || {
            ...makerOrder,
            maker: takerAddress,
            isBuy: !makerOrder.isBuy,
            postOnly: false
        };

        const makerSignature = orderSigner.signOrder(makerOrder, maker);
        const takerSignature = orderSigner.signOrder(takerOrder, taker);

        return {
            makerOrder,
            makerSignature,
            takerOrder,
            takerSignature,
            fillQuantity:
                options?.quantity ||
                BigNumber.min(makerOrder.quantity, takerOrder.quantity),
            fillPrice: options?.price || makerOrder.price
        };
    }
}
