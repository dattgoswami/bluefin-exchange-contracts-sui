# Firefly Exchange Contracts V2
Repository containing firefly core exchange contracts that allow users to do on-chain derivatives trading on **SUI** blockchain.


## How to
- Install dependencies using `yarn`
- Create `.env` file using `.env.example` provided. Specify the deployer account (ed25519) seed and RPC_URL 
- To deploy `firefly_exchange` contracts run `yarn deploy`
    The script will deploy the contracts, extract created objects and write them to `./deployment.json` file
    ```
    PS D:\Github\firefly-exchange-contracts-v2> yarn deploy
    yarn run v1.22.11
    $ ts-node ./scripts/deploy.ts
    Performing deployment on: https://fullnode.devnet.sui.io
    Deployer SUI address: 0x38b0c33f3d0433fb1a0312b40c6131f62c0dd14f
    INCLUDING DEPENDENCY MoveStdlib
    INCLUDING DEPENDENCY Sui
    BUILDING firefly_exchange
    Package published
    Creating Perpetual Markets
    -> ETH-PERP
    Object details written to file: ./deployment.json
    Done in 21.94s.
    ```

**Running Tests:**
- Deploy contracts using `yarn deploy`
- Run tests using `yarn test`