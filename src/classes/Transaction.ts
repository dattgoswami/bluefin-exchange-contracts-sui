import {
    SuiTransactionBlockResponse,
    getExecutionStatusError
} from "@mysten/sui.js";
import { UserPositionExtended } from "../interfaces";
import { ERROR_CODES } from "../errors";
import BigNumber from "bignumber.js";
import { SignedNumberToBigNumber } from "../library";

export class Transaction {
    static getStatus(tx: SuiTransactionBlockResponse) {
        return tx.effects?.status.status;
    }

    // if no error returns error code as 0
    static getErrorCode(tx: SuiTransactionBlockResponse): number | undefined {
        if (Transaction.getStatus(tx) == "failure") {
            const error = tx.effects?.status.error as string;

            return error.lastIndexOf(",") > 0
                ? Number(
                      error.slice(
                          error.lastIndexOf(",") + 2,
                          error.lastIndexOf(")")
                      )
                  )
                : undefined;
        }
        return 0;
    }

    static getError(tx: SuiTransactionBlockResponse): string {
        const code = Transaction.getErrorCode(tx);
        if ((code as number) > 0) {
            return (ERROR_CODES as any)[code as number];
        } else if (code == undefined) {
            return tx.effects?.status.error as string;
        } else {
            return "";
        }
    }

    static getEvents(
        tx: SuiTransactionBlockResponse,
        eventName?: string
    ): Array<any> {
        let events = [];

        if (tx?.events) {
            if (eventName != "") {
                events = tx?.events
                    ?.filter((x: any) => x.type.indexOf(eventName) >= 0)
                    .map((x: any) => {
                        return x.parsedJson;
                    });
            }
        }

        return events;
    }

    static getCreatedObjectIDs(tx: SuiTransactionBlockResponse): string[] {
        const ids: string[] = [];
        const objects = tx.effects?.created as any[];
        for (const itr in objects) {
            ids.push(objects[itr].reference.objectId);
        }
        return ids;
    }

    static getAllMutatedObjectIDs(tx: SuiTransactionBlockResponse): string[] {
        const ids: string[] = [];
        const objects = tx.objectChanges as any[];
        for (const itr in objects) {
            ids.push(objects[itr].objectId);
        }
        return ids;
    }

    static getMutatedObjectsUsingType(
        tx: SuiTransactionBlockResponse,
        type: string
    ): string[] {
        const objects = tx.objectChanges as any[];
        const ids: string[] = [];
        for (const itr in objects) {
            if (objects[itr].objectType.indexOf(type) > 0) {
                ids.push(objects[itr].objectId);
            }
        }
        return ids;
    }

    static getObjectsFromEvents(
        tx: SuiTransactionBlockResponse,
        list: string,
        objectType: string
    ): object[] {
        const objects: object[] = [];

        const events = tx.events as any;

        for (const ev of events) {
            const obj = ev[list];
            if (obj !== undefined) {
                const objType = obj["type"]
                    .slice(obj["type"].lastIndexOf("::") + 2)
                    .replace(/[^a-zA-Z ]/g, "");
                if (objectType == "" || objType == objectType) {
                    objects.push({
                        id: obj["id"],
                        dataType: objType,
                        data: obj["parsedJson"]
                    } as object);
                }
            }
        }
        return objects;
    }

    static getAccountPositionFromEvent(
        tx: SuiTransactionBlockResponse,
        address: string
    ): UserPositionExtended {
        const events = Transaction.getEvents(tx, "AccountPositionUpdateEvent");
        let userPosition: UserPositionExtended;
        if (events[0].position.user == address)
            userPosition = events[0].position;
        else if (events[1].position.user == address)
            userPosition = events[1].position;
        else
            throw `AccountPositionUpdate event not found for address: ${address}`;

        return userPosition;
    }

    static getAccountPNL(
        tx: SuiTransactionBlockResponse,
        address: string
    ): BigNumber {
        const events = Transaction.getEvents(tx, "TradeExecuted");

        if (events.length == 0) {
            throw "No TradeExecuted event found in tx";
        }

        if (address == events[0].maker) {
            return SignedNumberToBigNumber(events[0].makerPnl);
        } else if (address == events[0].taker) {
            return SignedNumberToBigNumber(events[0].takerPnl);
        } else {
            throw `TradeExecuted event not found for address: ${address}`;
        }
    }

    static getAccountBankBalanceFromEvent(
        tx: SuiTransactionBlockResponse,
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

    // assumes if there was any object created, it was bank account
    static getBankAccountID(tx: SuiTransactionBlockResponse): string {
        // if an object is created its bank account
        const createdObjects = this.getCreatedObjectIDs(tx);
        const mutatedObjects = this.getMutatedObjectsUsingType(
            tx,
            "BankAccount"
        );
        if (createdObjects.length > 0) {
            return createdObjects[0];
        } else if (mutatedObjects.length > 0) {
            return mutatedObjects[0];
        } else {
            return "";
        }
    }
}
