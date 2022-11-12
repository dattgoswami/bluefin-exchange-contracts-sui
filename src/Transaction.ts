import {
    SuiExecuteTransactionResponse,
    getExecutionStatusError
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

    static getCreatedObjects(
        tx: SuiExecuteTransactionResponse,
        objectType: string = ""
    ): Object[] {
        const objects: Object[] = [];

        const events = (tx as any).EffectsCert.effects.effects.events;
        for (const ev of events) {
            const obj = ev["newObject"];
            if (obj !== undefined) {
                const objType = obj["objectType"].slice(
                    obj["objectType"].lastIndexOf("::") + 2,
                    obj["objectType"].length - 1
                );
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
