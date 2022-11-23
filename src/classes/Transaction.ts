import {
    SuiExecuteTransactionResponse,
    getExecutionStatusError,
    SuiCertifiedTransactionEffects
} from "@mysten/sui.js";
import { Object } from "../interfaces";
import { ERROR_CODES } from "../errors";

export class Transaction {
    static getStatus(txResponse: SuiExecuteTransactionResponse) {
        return (txResponse as any)["EffectsCert"] == undefined
            ? (txResponse as any)["effects"]["status"]
            : (txResponse as any)["EffectsCert"]["effects"]["effects"][
                  "status"
              ];
    }

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

    static getEvents(tx: SuiExecuteTransactionResponse | any, name = "") {
        let events = [];
        if (tx?.EffectsCert) {
            const transactionEffects: SuiCertifiedTransactionEffects =
                tx?.EffectsCert?.effects;

            events = transactionEffects?.effects?.events as any;
            if (name != "") {
                events = events
                    ?.filter(
                        (x: any) => x["moveEvent"]?.type?.indexOf(name) >= 0
                    )
                    .map((x: any) => {
                        return x["moveEvent"];
                    });
            }
        }

        return events;
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
