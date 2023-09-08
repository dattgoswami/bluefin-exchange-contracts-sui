<div align="center">
  <img height="100x" src="https://bluefin.io/images/bluefin-logo.svg" />

  <h1 style="margin-top:20px;">Bluefin Exchange Contracts Sui</h1>

</div>

Repository containing bluefin core exchange contracts that allow users to do on-chain derivatives trading on [Sui](https://sui.io/) blockchain.

## Prerequisites:

- SUI Node: 1.2.0
- Node: v18.x.x

## How to

- Clone submodules using `yarn submodules`
- Install dependencies using `yarn`
- Create a wallet on sui using `sui client new-address secp256k1`
- Create `.env` file using `.env.example` provided. Specify the DEPLOYER_SEED (secp256k1) and DEPLOY_ON (See `networks.json` for available networks to deploy) The Deployer account must be in sui-client addresses.
- To deploy pyth oracle contract for testing purposes run `yarn deploy:pyth`
  Then continue to deploy bluefin_foundation
- To deploy `bluefin_foundation` contracts run `yarn deploy`
  The script will deploy the contracts, and create any markets specified in `DeploymentConfig.ts`, extract created objects and write them to `./deployment.json` file

  ```
  $ ts-node ./scripts/deploy/full.ts
  Performing full deployment on: http://suitest.bluefin.io:9000
  Deployer SUI address: 0x0d8790b07549b9f3cfc8f66a3719cd1d6636812fb76e0b3306d13f429706f8a9
  2023-05-24T10:04:21.034302Z  INFO sui::client_commands: Active environment switched to [local]
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
  Done in 9.91s.
  ```

**Running Tests:**

- Update .env file with DEPLOY_ON and DEPLOYER_SEED
- Fund deployer using `yarn faucet --account <acct_address>`
- Fund testing accounts using `yarn fund:test:accounts`
- Deploy the package using `yarn deploy`, Every time any change is made to package, it will need to be re-deployed before running tests
- Run tests using `yarn test`

## Scripts

| Name                          | Description                                                       | Command                  |
| ----------------------------- | ----------------------------------------------------------------- | ------------------------ |
| Package and Market Deployment | Deploys the package and all markets provided in Deployment Config | `yarn deploy`            |
| Package Deployment            | Deploys the package                                               | `yarn deploy:package`    |
| Market Deployment             | Deploys the market specified in .env                              | `yarn deploy:market`     |
| Faucet                        | Sends SUI coin to provided address coin                           | `yarn faucet -a "0x..."` |
| Make Trade                    | Performs a trade between 2 accounts                               | `yarn make:trade`        |

## Move.toml file when deploying pyth to mainnet/testnet with Pyth network

Basically when we deploy bluefin_foundation to mainnet or testnet we use Pyth integration to get
the oracle price. For that We need

1. to have CODE of Pyth available which is a dependency of bluefin_foundation.
2. to have CODE of wormhole available which is a dependency of Pyth.
3. these code are there in submodules.
4. When we run `yarn deploy` what happens is that first it reads the `pyth/priceInfoObject.json` and in that it gets the price feed id of btc and eth and gets the object id using pyth feed id and updates it inplace there to ensure that our feed id are correct.
5. You need to ensure that the following values in in `pyth/priceInfoObject.json` are correct for both testnet and mainnet

   1. Pyth Package ID
   2. Wormhole State ID
   3. Wormhole Package ID
   4. Pyth State ID
   5. BTC price feed id
   6. ETH price feed id

6. The code will pick up the package id from here and automatically update the Move.toml file of pyth network and wormhole.
7. IT WILL NOT UPDATE THE BLUEFIN_FOUNDATION file and you need to manually update the bluefin_foundation file in that replace the Pyth id with the relevant pyth id.
8. These instructions are only relevant when we are deploying to mainnet/testnet with real pyth integrated.

## For Deploying FAke Pyth on TESTNET /MAINNET

1. First ensure that your .env file looks like this

```
DEPLOY_ON = testnet/mainnet
ENV = DEV
DEPLOYER_SEED =
```

2. Then run `yarn deploy:pyth`
3. Then verify if pyth package id is same in Move.toml file of bluefin foundation. It will be same but just for sanity check. Ensure that path is pointing to local pyth and package id mentioned there is same as that in `pythFakeDeployment.json`
4. Then run `yarn deploy`
