import { SuiEvent } from "@mysten/sui.js";
import { Channel, Connection, connect } from "amqplib";
import { EventQueueData } from "./Interfaces";
import { parseEvent } from "./utils";
import { log } from "./utils/logger";

export class RabbitMQAdapter {
    readonly rabbitMQUrl: string;
    readonly channelName: string;

    queue: Connection;
    eventsChannel: Channel;

    /**
     *
     * @param _rabbitMQUrl amqp address of rabbit mq
     * @param _channelName name of the rabbit mq channel on which listened events will be written
     */
    constructor(
        _rabbitMQUrl: string = undefined as any,
        _channelName: string = undefined as any
    ) {
        // assign rabbit mq url
        this.rabbitMQUrl = _rabbitMQUrl;

        // assign name of the channel
        this.channelName = _channelName;

        // TODO: find correct way to make eventsChannel and queue undefined
        this.eventsChannel = null as any;
        this.queue = null as any;
    }

    /**
     * @notice creates connection with rabbit mq and creates EVENTS channel
     */
    async initRabbitMQ(): Promise<void> {
        // create connection with rabbit mq
        this.queue = await connect(this.rabbitMQUrl);
        // create a channel
        this.eventsChannel = await this.queue.createChannel();
        // create channel by channel name if not exists
        await this.eventsChannel.assertQueue(this.channelName);
    }

    /**
     * @notice closes rabbit mq connection and the opened channel
     */
    async closeRabbitMQ(): Promise<void> {
        await this.eventsChannel.close();
        await this.queue.close();
    }

    /**
     * @notice default callback for event processing. It pushes the
     * received event into event rabbitMQ
     * @param event data event received from chain
     */
    public defaultCallback(event: SuiEvent): void {
        log.info("%o", event);

        const parsedEvent = parseEvent(event);
        if (parsedEvent) {
            this.sendEventToQueue(parsedEvent);
        }
    }

    /**
     * @notice private function used by event listeners to post event data into rabbit mq
     * @param event event payload received from chain
     */
    private sendEventToQueue(data: EventQueueData): void {
        this.eventsChannel.sendToQueue(
            this.channelName,
            Buffer.from(JSON.stringify(data))
        );
    }
}
