import {
    SuiExecuteTransactionResponse,
    getExecutionStatusError,
    SuiCertifiedTransactionEffects
} from "@mysten/sui.js";
import { Object, UserPositionExtended } from "../interfaces";
import { ERROR_CODES } from "../errors";

export class Transaction {
    static getStatus(txResponse: SuiExecuteTransactionResponse) {
        return (txResponse as any)["effects"]["status"] == undefined
            ? (txResponse as any)["effects"]["effects"]["status"]["status"]
            : (txResponse as any)["effects"]["status"]["status"];
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

    static getEvents(
        tx: SuiExecuteTransactionResponse | any,
        eventName?: string
    ) {
        let events = [];

        if (tx?.effects) {
            events = tx?.effects?.effects?.events as any;
            if (eventName != "") {
                events = events
                    ?.filter(
                        (x: any) =>
                            x["moveEvent"]?.type?.indexOf(eventName) >= 0
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

    static getAccountPositionFromEvent(
        tx: SuiExecuteTransactionResponse,
        address: string
    ): undefined | UserPositionExtended {
        const events = Transaction.getEvents(tx, "AccountPositionUpdateEvent");
        let userPosition;

        if (events[0].fields.account == address)
            userPosition = events[0].fields.position;
        else if (events[1].fields.account == address)
            userPosition = events[1].fields.position.fields;
        else return undefined;

        return userPosition.fields as UserPositionExtended;
    }
}
