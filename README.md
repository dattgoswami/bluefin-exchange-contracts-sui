# Bluefin Exchange Contracts SUI

Repository containing bluefin core exchange contracts that allow users to do on-chain derivatives trading on **SUI** blockchain.

## How to

- Install dependencies using `yarn`
- Create a wallet on sui using `sui client new-address secp256k1`
- Create `.env` file using `.env.example` provided. Specify the DEPLOYER_SEED (secp256k1) and DEPLOY_ON (See `networks.json` for available networks to deploy) The Deployer account must be in sui-client addresses.
- To deploy `bluefin_foundation` contracts run `yarn deploy`
  The script will deploy the contracts, extract created objects and write them to `./deployment.json` file
  ```
  PS D:\Github\bluefin-exchange-contracts-v2> yarn deploy
  yarn run v1.22.11
  $ ts-node ./scripts/deploy.ts
  Performing deployment on: https://fullnode.devnet.sui.io
  Deployer SUI address: 0x38b0c33f3d0433fb1a0312b40c6131f62c0dd14f
  INCLUDING DEPENDENCY MoveStdlib
  INCLUDING DEPENDENCY Sui
  BUILDING bluefin_foundation
  Package published
  Creating Perpetual Markets
  -> ETH-PERP
  Object details written to file: ./deployment.json
  Done in 21.94s.
  ```

**Running Tests:**

- Use following .env:
  ```
  DEPLOY_ON = cloud
  DEPLOYER_SEED = bicycle trim fit ticket penalty basket window tunnel insane orange virtual tennis
  ```
- Fund deployer using `yarn faucet --account 0x......`
- Fund testing accounts using `yarn fund:test:accounts`
- Deploy the package using `yarn deploy`, Every time any change is made to package, it will need to be re-deployed before running tests
- Run tests using `yarn test`

**Scripts:**
| Name | Description | Command |
|--------------------------------|-------------------------------------------------------------------------------------------------------------------|--------------------------------|
| Package and Market Deployment | Deploys the package and all markets provided in Deployment Config | `yarn deploy` |
| Package Deployment | Deploys the package | `yarn deploy:package` |
| Market Deployment | Deploys the market specified in .env | `yarn deploy:market` |
