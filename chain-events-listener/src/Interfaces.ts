import { SuiEventType } from "./utils";

// interface of the json contract events config
export interface ContractEventsConfig {
    packageObjectId: string;
    module: string;
    events: string[];
}

export interface EventQueueData {
    module: string;
    event: string | null;
    data: object | null;
    sender: string | null;
    packageId: string | null;
    timestamp: number;
    transactionHash: string;
}
