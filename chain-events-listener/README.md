# Chain Event Listener

The codebase is responsible for listening to events emitted by chain and pushing the listened data to rabbit mq.
The chain event listener, listens to specified set of events on the packages provided in config. The data received from events is marshelled into `EventQueueData` and is posted to RabbitMQ

## How to:

1-Make sure you are using NodeJS >= `16`. Install `yarn` if not already installed using `npm install -g yarn`.
2-You can setup Nodejs, pm2 and yarn using `chmod +x ./scripts/preq.sh && ./scripts/preq.sh`
3-Install dependencies of the repo using `yarn`.
4-Install docker if not already installed using: `yarn install:docker`

## Pre-requisites

1- Make sure you have a running instance of RabbitMQ. You can use docker to run a RabbitMQ instance using `yarn start:docker:rabbitmq`
2- Add `events.json` in config folder. You can use `events.json.example` as a reference.
3-Create .env file in the root of the project. You can use `.env.example` as a reference. Make use to update the mandatory values in env. such as
`RPC_URL`,`AMQP_URI` and `CHANNEL` **NOTE**: see `example.env` for more details.

## Running the codebase:

before running the codebase, make sure you have a running completed all the pre-requisites.
1 run `yarn`
1- `yarn build`
2- `yarn start`
**NOTE**: if you want to run in the debug mode or without building, use `yarn start:dev` it will start the codebase without building.

### Deployment:

1 - To run chain event listener in production setting, update `configs/events.json` with events information
2 - Install docker if not already installed using: `yarn install:docker`

3 - Update `.env` file and provide necessary variables. Make sure to have rabbit mq up and running, if not then for demo purpose one can be spun up using `yarn start:docker:rabbitmq`.

4 - Once done, run `start` or `yarn start:pm2:process` to configure chain event listener based on the events supplied in json file and start listening to events.

### Tests:

Before running tests, ensure that you have rabbitmq up and running. You can start a dockerized version of rabbitmq using `yarn start:docker:rabbitmq`. Update .env file with correct values for variables and run `yarn test`
