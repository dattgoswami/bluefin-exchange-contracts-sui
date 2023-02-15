import { JsonRpcProvider, Keypair } from "@mysten/sui.js";
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
        takerOrder?: Order
    ) {
        const takerAddress = await getSignerSUIAddress(
            getSignerFromKeyPair(taker, provider)
        );

        const _takerOrder = takerOrder || {
            ...makerOrder,
            maker: takerAddress,
            isBuy: !makerOrder.isBuy
        };

        const makerSignature = await orderSigner.signOrder(makerOrder, maker);
        const takerSignature = await orderSigner.signOrder(_takerOrder, taker);

        return {
            makerOrder,
            makerSignature,
            takerOrder: _takerOrder,
            takerSignature,
            fillQuantity: makerOrder.quantity,
            fillPrice: makerOrder.price
        };
    }
}
