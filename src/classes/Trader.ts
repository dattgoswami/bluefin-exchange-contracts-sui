import { JsonRpcProvider, Keypair } from "@mysten/sui.js";
import BigNumber from "bignumber.js";
import { Order } from "../interfaces";
import { getSignerFromKeyPair, getSignerSUIAddress } from "../utils";
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
        const takerAddress = await getSignerSUIAddress(
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
            fillQuantity: options?.quantity || makerOrder.quantity,
            fillPrice: makerOrder.price
        };
    }
}
