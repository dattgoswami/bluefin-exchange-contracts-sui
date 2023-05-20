import { config } from "dotenv";
config({ path: ".env" });

import { ChainEventListener } from "../src/ChainEventsListener";
import { ContractEventsConfig } from "../src/Interfaces";
import { RabbitMQAdapter } from "../src/RabbitMQAdapter";

import { log } from "../src/utils/logger";
import EventJson from "../configs/events.json";
import { SuiEvent, SuiEventFilter } from "@mysten/sui.js";
import { parseEvent } from "../src/utils";

const JSONData: ContractEventsConfig[] = EventJson;

// TODO: create envstore
const rpcURL = process.env.RPC_URL as string;
const rabbitMQURL = process.env.AMQP_URI as string;
const channelName = process.env.CHANNEL as string;

const callback = (event: SuiEvent) => {
    log.info(parseEvent(event));
};

async function main() {
    const contractEventsConfig: ContractEventsConfig[] = JSONData; // typecase imported data

    // create chain event listener
    log.debug("Creating Chain Event Listener");
    log.debug(`rpcURL: ${rpcURL}`);
    log.debug(`rabbitMQURL: ${rabbitMQURL}`);
    log.debug(`channelName: ${channelName}`);

    const chainEventListener = new ChainEventListener(rpcURL);
    let rabbitMQAdapter: RabbitMQAdapter = undefined as any;

    if (rabbitMQURL && channelName) {
        log.debug("Initializing RabbitMQ connection");
        rabbitMQAdapter = new RabbitMQAdapter(rabbitMQURL, channelName);
        await rabbitMQAdapter.initRabbitMQ();
    }

    log.debug("Adding Contracts and respective Events Event Listener");
    // create chain event listener
    let length = Object.keys(contractEventsConfig).length;
    let totalEvents = 0;

    const eventFilter: SuiEventFilter = { Any: [] };

    // for every contract events map in json
    while (contractEventsConfig[--length]) {
        const { packageObjectId, module, events } =
            contractEventsConfig[length];

        if (!events.length) {
            continue;
        }

        events.forEach((e) => {
            eventFilter.Any.push({
                MoveEventType: `${packageObjectId}::${module}::${e}`,
            });
        });

        totalEvents += events.length;
    } // end of while

    log.info(`Starting Listeners`);

    await chainEventListener.startListeners(
        eventFilter,
        rabbitMQAdapter
            ? rabbitMQAdapter.defaultCallback.bind(rabbitMQAdapter)
            : callback
    );

    log.info(`Done. Listening to events. Events count: ${totalEvents}`);
}

main().then().catch(console.error);
