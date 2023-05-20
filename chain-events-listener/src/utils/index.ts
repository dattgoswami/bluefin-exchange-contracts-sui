import { SuiEvent } from "@mysten/sui.js";
import { EventQueueData } from "../Interfaces";

export function parseEvent(event: SuiEvent) {
    const parsedEvent: EventQueueData = {
        timestamp: Number(event.timestampMs),
        transactionHash: event.id.txDigest,
        packageId: event.packageId,
        sender: event.sender,
        module: event.transactionModule,
        event: parseEventType(event.type),
        data: parseEventData(event.parsedJson),
    };

    return parsedEvent;
}

export function parseEventType(qType: string): string | null {
    const matchedGroups = qType?.match(/::(?<e>\w+)$/)?.groups;
    return matchedGroups ? matchedGroups.e : null;
}

export function parseEventData(obj: any) {
    if (!obj) {
        return null;
    }

    const parsedObject: Record<string, any> = {};

    const keys = Object.keys(obj);
    keys.map((x) => {
        if (typeof obj[x] === "object") {
            parsedObject[x] = parseEventData(obj[x]);
        } else {
            parsedObject[x] = obj[x];
        }
    });

    return parsedObject;
}
