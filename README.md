# Bluefin Exchange Contracts

Repository containing bluefin core exchange contracts that allow users to do on-chain derivatives trading on [Sui](https://sui.io/) blockchain.

## Prerequisites:

- SUI Node: v0.27.1
- Node: v18.x.x

## How to

- Install dependencies using `yarn`
- Create a wallet on sui using `sui client new-address secp256k1`
- Create `.env` file using `.env.example` provided. Specify the DEPLOYER_SEED (secp256k1) and DEPLOY_ON (See `networks.json` for available networks to deploy) The Deployer account must be in sui-client addresses.
- To deploy `bluefin_foundation` contracts run `yarn deploy`
  The script will deploy the contracts, and create any markets specified in `DeploymentConfig.ts`, extract created objects and write them to `./deployment.json` file
  ```
  $ ts-node ./scripts/deploy/full.ts
  Performing full deployment on: http://127.0.0.1:9000
  Deployer SUI address: 0x42696a5734546c3acc9019ef93543609cb5c5c89
  Switched client env to: local
  Switched client account to: 0x42696a5734546c3acc9019ef93543609cb5c5c89
  INCLUDING DEPENDENCY Sui
  INCLUDING DEPENDENCY MoveStdlib
  BUILDING bluefin_foundation
  Skipping dependency verification
  Package published
  Status: success
  Creating Perpetual Markets
  -> ETH-PERP
  -> BTC-PERP
  Object details written to file: ./deployment.json
  Done in 7.64s.
  ```

**Running Tests:**

- Updat .env file with DEPLOY_ON and DEPLOYER_SEED. To run tests against our internal cloud Sui use the following:

  ```
  DEPLOY_ON = cloud
  DEPLOYER_SEED = settle image finger column since happy input rebuild betray float magnet produce surge pipe bag language point cover neglect disorder egg sheriff erosion negative
  ```

- Fund deployer using `yarn faucet --account 0x42696a5734546c3acc9019ef93543609cb5c5c89`
- Fund testing accounts using `yarn fund:test:accounts`
- Deploy the package using `yarn deploy`, Every time any change is made to package, it will need to be re-deployed before running tests
- Run tests using `yarn test`

## Scripts

| Name                          | Description                                                       | Command                  |
| ----------------------------- | ----------------------------------------------------------------- | ------------------------ |
| Package and Market Deployment | Deploys the package and all markets provided in Deployment Config | `yarn deploy`            |
| Package Deployment            | Deploys the package                                               | `yarn deploy:package`    |
| Market Deployment             | Deploys the market specified in .env                              | `yarn deploy:market`     |
| Faucet                        | Provides address with SUI coin                                    | `yarn faucet -a "0x..."` |
