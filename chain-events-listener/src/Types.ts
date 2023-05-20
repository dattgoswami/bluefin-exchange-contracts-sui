import { SuiEvent } from "@mysten/sui.js";
export type address = string;
export type eventTopic = string;
export type listenerCallback = (event: SuiEvent) => void;
