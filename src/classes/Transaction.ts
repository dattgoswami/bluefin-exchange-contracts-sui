import {
    SuiExecuteTransactionResponse,
    getExecutionStatusError
} from "@mysten/sui.js";
import { UserPositionExtended } from "../interfaces";
import { ERROR_CODES } from "../errors";
import BigNumber from "bignumber.js";
import { SignedNumberToBigNumber } from "../library";

export class Transaction {
    static getStatus(txResponse: SuiExecuteTransactionResponse) {
        return (txResponse as any)["effects"]["status"] == undefined
            ? (txResponse as any)["effects"]["effects"]["status"]["status"]
            : (txResponse as any)["effects"]["status"]["status"];
    }

    // if no error returns error code as 0
    static getErrorCode(tx: SuiExecuteTransactionResponse): number {
        if (Transaction.getStatus(tx) == "failure") {
            const error = getExecutionStatusError(tx) as string;
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
        objectType = ""
    ): object[] {
        const objects: object[] = [];

        const events = (tx as any).EffectsCert
            ? (tx as any).EffectsCert.effects.effects.events
            : (tx as any).effects.effects.events;

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
                    } as object);
                }
            }
        }
        return objects;
    }

    static getObjects(
        tx: SuiExecuteTransactionResponse,
        list: string,
        objectType: string
    ): object[] {
        const objects: object[] = [];

        const events = (tx as any).EffectsCert
            ? (tx as any).EffectsCert.effects.effects.events
            : (tx as any).effects.effects.events;

        for (const ev of events) {
            const obj = ev[list];
            if (obj !== undefined) {
                const objType = obj["objectType"]
                    .slice(obj["objectType"].lastIndexOf("::") + 2)
                    .replace(/[^a-zA-Z ]/g, "");
                if (objectType == "" || objType == objectType) {
                    objects.push({
                        id: obj["objectId"],
                        dataType: objType
                    } as object);
                }
            }
        }
        return objects;
    }

    static getAccountPositionFromEvent(
        tx: SuiExecuteTransactionResponse,
        address: string
    ): UserPositionExtended {
        const events = Transaction.getEvents(tx, "AccountPositionUpdateEvent");
        let userPosition: UserPositionExtended;

        if (events[0].fields.account == address)
            userPosition = events[0].fields.position.fields;
        else if (events[1].fields.account == address)
            userPosition = events[1].fields.position.fields;
        else
            throw `AccountPositionUpdate event not found for address: ${address}`;

        return userPosition;
    }

    static getAccountPNL(
        tx: SuiExecuteTransactionResponse,
        address: string
    ): BigNumber {
        const events = Transaction.getEvents(tx, "TradeExecuted");

        if (events.length == 0) {
            throw "No TradeExecuted event found in tx";
        }

        if (address == events[0].fields.maker) {
            return SignedNumberToBigNumber(events[0].fields.makerPnl.fields);
        } else if (address == events[0].fields.taker) {
            return SignedNumberToBigNumber(events[0].fields.takerPnl.fields);
        } else {
            throw `TradeExecuted event not found for address: ${address}`;
        }
    }

    static getAccountBankBalanceFromEvent(
        tx: SuiExecuteTransactionResponse,
        address: string
    ): BigNumber {
        const events = Transaction.getEvents(tx, "BankBalanceUpdate");

        if (!address.startsWith("0x")) {
            address = "0x" + address;
        }

        if (events.length == 0) {
            return BigNumber(0);
        }

        // assuming the first event will have latest bank balance for account
        for (const ev of events) {
            if (ev.fields.destAddress == address) {
                return BigNumber(ev.fields.destBalance);
            } else if (ev.fields.srcAddress == address) {
                return BigNumber(ev.fields.srcBalance);
            }
        }
        return BigNumber(0);
    }

    static getBankAccountID(tx: SuiExecuteTransactionResponse): string {
        const newObject = Transaction.getObjects(
            tx,
            "newObject",
            "BankAccount"
        );
        const transferObject = Transaction.getObjects(
            tx,
            "transferObject",
            "BankAccount"
        );

        if (newObject.length > 0) {
            return (newObject[0] as any).id;
        }

        if (transferObject.length > 0) {
            return (transferObject[0] as any).id;
        }
        return "";
    }

    static getAllBankAccounts(tx: SuiExecuteTransactionResponse) {
        const newObject = Transaction.getObjects(
            tx,
            "newObject",
            "BankAccount"
        );
        const transferObject = Transaction.getObjects(
            tx,
            "transferObject",
            "BankAccount"
        );
        return [...newObject, ...transferObject];
    }
}
