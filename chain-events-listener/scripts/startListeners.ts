import { config } from "dotenv";
config({ path: ".env" });

import { ChainEventListener } from "../src/ChainEventsListener";
import { ContractEventsConfig } from "../src/Interfaces";
import { RabbitMQAdapter } from "../src/RabbitMQAdapter";

import { log } from "../src/utils/logger";
import EventJson from "../configs/events.json";
import { SuiEventFilter } from "@mysten/sui.js";

let JSONData: ContractEventsConfig[] = EventJson;

const rpcURL = process.env.RPC_URL as string;

const rabbitMQUrl = process.env.AMQP_URI as string;

const channelName = process.env.CHANNEL as string;

async function main() {
    const contractEventsConfig: ContractEventsConfig[] = JSONData; // typecase imported data

    // create chain event listener
    log.debug("Creating Chain Event Listener");

    const rabbitMQAdapter = new RabbitMQAdapter(rabbitMQUrl, channelName);
    const chainEventListener = new ChainEventListener(rpcURL);

    log.debug("Initializing RabbitMQ connection");

    await rabbitMQAdapter.initRabbitMQ();

    log.debug("Adding Contracts and respective Events Event Listener");
    // create chain event listener
    log.debug("Creating Chain Event Listener");
    log.debug(`rpcURL: ${rpcURL}`);
    log.debug(`rabbitMQUrl: ${rabbitMQUrl}`);
    log.debug(`channelName: ${channelName}`);

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

        eventFilter.Any.push({
            And: [
                {
                    Package: packageObjectId,
                },
                {
                    Any: events.map((event) => ({
                        MoveEventType: `${packageObjectId}::${module}::${event}`,
                    })),
                },
            ],
        });

        totalEvents += events.length;
    } // end of while

    log.info(`Starting Listeners`);

    await chainEventListener.startListeners(
        eventFilter,
        rabbitMQAdapter.defaultCallback.bind(rabbitMQAdapter)
    );

    log.info(`Done. Listening to events. Events count: ${totalEvents}`);
}

main().then().catch(console.error);
