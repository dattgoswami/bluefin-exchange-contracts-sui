import { JsonRpcProvider, Keypair } from "@mysten/sui.js";
import BigNumber from "bignumber.js";
import { Order } from "../interfaces";
import { getSignerFromKeyPair, getAddressFromSigner } from "../utils";
import { OrderSigner } from "./OrderSigner";

export class Trader {
    static async setupNormalTrade(
        provider: JsonRpcProvider,
        orderSigner: OrderSigner,
        maker: Keypair,
        taker: Keypair,
        makerOrder: Order,
        options?: { takerOrder?: Order; quantity?: BigNumber }
    ) {
        const takerAddress = await getAddressFromSigner(
            getSignerFromKeyPair(taker, provider)
        );

        const takerOrder = options?.takerOrder || {
            ...makerOrder,
            maker: takerAddress,
            isBuy: !makerOrder.isBuy
        };

        const makerSignature = await orderSigner.signOrder(makerOrder, maker);
        const takerSignature = await orderSigner.signOrder(takerOrder, taker);

        return {
            makerOrder,
            makerSignature,
            takerOrder: takerOrder,
            takerSignature,
            fillQuantity:
                options?.quantity ||
                BigNumber.min(makerOrder.quantity, takerOrder.quantity),
            fillPrice: makerOrder.price
        };
    }
}
