import { SuiEventEnvelope } from "@mysten/sui.js";
import { stringify } from "querystring";
import { EventQueueData } from "../Interfaces";
import { log } from "./logger";

export enum SuiEventType {
    Move = "Move",
    Publish = "Publish",
    CoinBalanceChange = "CoinBalanceChange",
    TransferObject = "TransferObject",
    MutateObject = "MutateObject",
    DeleteObject = "DeleteObject",
    NewObject = "NewObject",
    EpochChange = "EpochChange",
    Checkpoint = "Checkpoint",
}

const ObjectKeyByEventType: Record<SuiEventType, string> = {
    [SuiEventType.Move]: "moveEvent",
    [SuiEventType.Publish]: "publish",
    [SuiEventType.CoinBalanceChange]: "coinBalanceChange",
    [SuiEventType.TransferObject]: "transferObject",
    [SuiEventType.MutateObject]: "mutateObject",
    [SuiEventType.DeleteObject]: "deleteObject",
    [SuiEventType.NewObject]: "newObject",
    [SuiEventType.EpochChange]: "epochChange",
    [SuiEventType.Checkpoint]: "checkpoint",
};

const EventTypes = Object.keys(SuiEventType);

export function parseEvent(event: SuiEventEnvelope) {
    const suiEventType = getEventType(event);
    if (!suiEventType) {
        log.warn("Unknown event type %o", event);
        return null;
    }

    const eventObject = extractEventObject(event, suiEventType);

    const parsedEvent: EventQueueData = {
        timestamp: event.timestamp,
        transactionHash: event.txDigest,
        suiEventType: suiEventType,
        packageId: eventObject?.packageId ?? null,
        sender: eventObject?.sender ?? null,
        module: eventObject?.transactionModule ?? null,
        event: parseEventType(eventObject?.type),
        data: parseEventData(eventObject),
    };

    return parsedEvent;
}

function getEventType(event: SuiEventEnvelope): SuiEventType | null {
    const eventType = EventTypes.find(
        (x) => !!(event.event as any)[ObjectKeyByEventType[x as SuiEventType]]
    ) as SuiEventType;
    return eventType ?? null;
}

function extractEventObject(
    event: SuiEventEnvelope,
    suiEventType: SuiEventType
) {
    return (event.event as any)[ObjectKeyByEventType[suiEventType]] ?? null;
}

function parseEventType(qType: string): string | null {
    const matchedGroups = qType?.match(/::(?<e>\w+)$/)?.groups;
    return matchedGroups ? matchedGroups.e : null;
}
function parseEventModule(qType: string): string | null {
    const matchedGroups = qType?.match(/(?<e>\w+)::\w+$/)?.groups;
    return matchedGroups ? matchedGroups.e : null;
}
function parseEventPackageId(qType: string): string | null {
    const matchedGroups = qType?.match(/^(?<e>\w+)::/)?.groups;
    return matchedGroups ? matchedGroups.e : null;
}

function parseEventData(obj: any) {
    if (!obj) {
        return null;
    }

    const parsedObject: Record<string, any> = {};

    if (obj.type) {
        parsedObject.__type__ = parseEventType(obj.type);
        parsedObject.__module__ = parseEventModule(obj.type);
        parsedObject.__packageId__ = parseEventPackageId(obj.type);
    }

    if (obj.fields) {
        const keys = Object.keys(obj.fields);
        const fields = obj.fields;
        keys.map((x) => {
            if (typeof fields[x] === "object") {
                parsedObject[x] = parseEventData(fields[x]);
            } else {
                parsedObject[x] = fields[x];
            }
        });
    }

    return parsedObject;
}
