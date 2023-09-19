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
- After this please following the following schemes for deploying on testnet/mainnet/local


## For Deploying on local/testnet with fake pyth
1. Open the `.env` file and ensure that `DEPLOY_ON=local/testnet` and `ENV=DEV`
2. Run `yarn deploy:pyth` and wait for it to be completed
3. Run `yarn deploy` and wait for it to be completed




## For Deploying on testnet with REAL pyth
1. Open the `.env` file and ensure that `DEPLOY_ON=testnet` and `ENV=PROD`
2. Open folder `bluefin_foundation` and copy the contents of `Move.testnet.toml` to `Move.toml`
3. `cp bluefin_foundation/Move.testnet.toml bluefin_foundation/Move.toml`
4. Replace the Pyth Package id in `Move.toml` file with Pyth latest package id.
5. Replace the following in `pyth/priceInfoObject.json` on `testnet_pyth`:
   1. Pyth Package ID
   2. Pyth State ID
   3. Wormhole Package ID
   4. Wormhole State ID 
   
6. **Please double check that the package id and state ids are correct. Wrong ids will lead to undetectable errors.**
7. In `pyth/priceInfoObject.json` ensure that `feed_id` of respective markets are correct
   1. Feed_id are from pyth and can be retrieved from Pyth documentation, it keeps on changing hence we have not hardcoded it.
   2. feed_id are sometimes different for testnet and mainnet, for testnet update the relevant feed_id
8. Run `yarn deploy`




## For Deploying on testnet with REAL pyth
1. Open the `.env` file and ensure that `DEPLOY_ON=testnet` and `ENV=PROD`
2. Open folder `bluefin_foundation` and copy the contents of `Move.mainnet.toml` to `Move.toml`
3. `cp bluefin_foundation/Move.mainnet.toml bluefin_foundation/Move.toml`
4. Replace the Pyth Package id in `Move.toml` file with Pyth latest package id.
5. Replace the following in `pyth/priceInfoObject.json` on `mainnet_pyth`:
   1. Pyth Package ID
   2. Pyth State ID
   3. Wormhole Package ID
   4. Wormhole State ID 
6. **Please double check that the package id and state ids are correct. Wrong ids will lead to undetectable errors.**
7. In `pyth/priceInfoObject.json` ensure that `feed_id` of respective markets are correct
   1. Feed_id are from pyth and can be retrieved from Pyth documentation, it keeps on changing hence we have not hardcoded it.
   2. feed_id are sometimes different for testnet and mainnet, for mainnet update the relevant feed_id 
8. Run `yarn deploy`



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




## Context information on fake and real pyth.
1. Mainnet on sui is where real sui tokens and real usdc contracts are deployed
2. testnet on sui is where we can test out our contracts and is accessible to everyone
3. localnet is our own sui node running on docker container.
4. Pyth network is a service which gives us OraclePrice on request, However when testing our contracts, we need to frequently change oracle price in order to test liquidation, trade. 
   1. For the above purpose we have created a fake pyth, it is a contract just like pyth and it gives us the ability to change the oracle price to whatever we want for any market.
5. With real pyth we do not have the ability to change the oracle price according to our wishes.
6. When we say deployed on testnet with fake pyth we mean that we can manipulate the oracle prices.
7. When we say deployed on testnet with real pyth we mean that we have deployed the contracts with pyth as a dependency and now we do not have the ability to change oracle prices with too much deviation.

  