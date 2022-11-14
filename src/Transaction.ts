import {
    SuiExecuteTransactionResponse,
    getExecutionStatusError,
    SuiCertifiedTransactionEffects
} from "@mysten/sui.js";
import { Object } from "./interfaces";
import { ERROR_CODES } from "./errors";

export class Transaction {
    static getErrorCode(tx: SuiExecuteTransactionResponse): number {
        let error = getExecutionStatusError(tx) as string;
        return Number(
            error.slice(error.lastIndexOf(",") + 1, error.length - 1)
        );
    }

    static getError(tx: SuiExecuteTransactionResponse): string {
        const code = Transaction.getErrorCode(tx);
        return (ERROR_CODES as any)[code];
    }

    static getEvents(tx: SuiExecuteTransactionResponse | any) {
        if (tx?.EffectsCert) {
            const transactionEffects: SuiCertifiedTransactionEffects =
                tx?.EffectsCert?.effects;
            const events = transactionEffects?.effects?.events;
            return events;
        }

        return [];
    }

    static getCreatedObjects(
        tx: SuiExecuteTransactionResponse,
        objectType: string = ""
    ): Object[] {
        const objects: Object[] = [];

        const events = (tx as any).EffectsCert.effects.effects.events;
        for (const ev of events) {
            const obj = ev["newObject"];
            if (obj !== undefined) {
                const objType = obj["objectType"]
                    .slice(obj["objectType"].lastIndexOf("::") + 2)
                    .replace(/[^a-zA-Z ]/g, "");
                if (objectType == "" || objType == objectType) {
                    objects.push({
                        id: obj["objectId"],
                        dataType: objType
                    } as Object);
                }
            }
        }

        return objects;
    }
}
