import { expect } from "chai";
import { config } from "dotenv";
import { ChainEventListener } from "../src/ChainEventsListener";
import { RabbitMQAdapter } from "../src/RabbitMQAdapter";

config({ path: ".env" });

// read variables from .env file

// url of chain
const rpcURL = process.env.RPC_URL as string;
// url of rabbitmq
const rabbitMQUrl = process.env.AMQP_URI as string;

const channelName = "test_events";

describe("Chain Event Listener", () => {
    let eventListener: ChainEventListener;
    let rabbitMQAdapter: RabbitMQAdapter;

    beforeEach(async () => {
        // create event listener
        eventListener = new ChainEventListener(rpcURL);

        rabbitMQAdapter = new RabbitMQAdapter(rabbitMQUrl, channelName);
        // create rabbit mq connection
        await rabbitMQAdapter.initRabbitMQ();
    });

    afterEach(async () => {
        // close rabbit mq connection
        await rabbitMQAdapter.closeRabbitMQ();

        await eventListener.closeAllListeners();
    });

    describe("Initialization", async () => {
        it("should create chain event listener object with no packages", async () => {
            const eventListener = new ChainEventListener(rpcURL);

            const rabbitMQAdapter = new RabbitMQAdapter(
                rabbitMQUrl,
                channelName
            );

            expect(eventListener.rpcURL).to.be.equal(rpcURL);
            expect(rabbitMQAdapter.rabbitMQUrl).to.be.equal(rabbitMQUrl);
        });

        it("should create connection with rabbitMQ", async () => {
            const rabbitMQAdapter = new RabbitMQAdapter(
                rabbitMQUrl,
                channelName
            );

            await rabbitMQAdapter.initRabbitMQ();

            await rabbitMQAdapter.closeRabbitMQ();
        });
    });
});
