import {
    SuiExecuteTransactionResponse,
    getExecutionStatusError
} from "@mysten/sui.js";
import { Object, UserPositionExtended } from "../interfaces";
import { ERROR_CODES } from "../errors";
import BigNumber from "bignumber.js";
import {
    bigNumber,
    SignedNumberToBigNumber,
    SignedNumberToBigNumberStr
} from "../library";

export class Transaction {
    static getStatus(txResponse: SuiExecuteTransactionResponse) {
        return (txResponse as any)["effects"]["status"] == undefined
            ? (txResponse as any)["effects"]["effects"]["status"]["status"]
            : (txResponse as any)["effects"]["status"]["status"];
    }

    // if no error returns error code as 0
    static getErrorCode(tx: SuiExecuteTransactionResponse): number {
        if (Transaction.getStatus(tx) == "failure") {
            let error = getExecutionStatusError(tx) as string;
            return Number(
                error.slice(error.lastIndexOf(",") + 1, error.length - 1)
            );
        }
        return 0;
    }

    static getError(tx: SuiExecuteTransactionResponse): string {
        const code = Transaction.getErrorCode(tx);
        if (code > 0) {
            return (ERROR_CODES as any)[code];
        } else {
            return "";
        }
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
        let userPosition: UserPositionExtended;

        if (events[0].fields.account == address)
            userPosition = events[0].fields.position.fields;
        else if (events[1].fields.account == address)
            userPosition = events[1].fields.position.fields;
        else return undefined;

        return userPosition;
    }

    static getAccountPNL(
        tx: SuiExecuteTransactionResponse,
        address: string
    ): BigNumber | undefined {
        const events = Transaction.getEvents(tx, "TradeExecuted");

        if (events.length == 0) {
            return undefined;
        }

        if (address == events[0].fields.maker) {
            return SignedNumberToBigNumber(events[0].fields.makerPnl.fields);
        } else if (address == events[0].fields.taker) {
            return SignedNumberToBigNumber(events[0].fields.takerPnl.fields);
        } else {
            return undefined;
        }
    }
}
