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

- Provide `RPC_URL` and `SEED` in `.env` file
- Deploy the package using `yarn deploy`, Every time any change is made to package, it will need to be re-deployed before running tests
- Run tests using `yarn test`


## Local Sui Network on Cloud

Local SUI network is hosted on cloud to cater fast pace development.

URL: http://44.209.107.20:9000

**Local Faucet:**
- Use following cmd to fund your account. Make sure to replace receipt address with your own account address
- curl http://44.209.107.20/gas -H 'Content-Type: application/json' -d '{"FixedAmountRequest":{ "recipient":"9b69d756ed5c1909a99289fae52527b7642969a1"}}'
  > Note : Make sure to fund wallet with sui tokens when deployments is done locally

**Prefunded Addresses & Pvt. Keys:**
-  0x06566035d9063df8e2dc8c1010a56734b61f298b
-  0x1c16db35f74bb03ec8db0cb7de7ab49b2c37862d
-  0x39c47ba0c144792eddbaeb3332f48871938e66fb
-  0x4933e2e2d4e110eb0412aa4b6339e5d973865813
-  0x9b69d756ed5c1909a99289fae52527b7642969a1

-  AOxMdgOPm/zwhGNn5WwWLLH5vx3jBfUlKnmXEd++iyGkhdaza94v3JxZ/KDcfa6S2+6J4Eu+intGyIc7eiT+wMo=
-  ALbdX9jP+eYpq1xjCw6ZKNjGvbhmFkMRIWegHJOdepsmm2YKMkoPOybFIz8e+V+YeRQ6Y5V9ifbOqV8BQFK4a9c=
-  AFnNJA2/1UxmXanVAwbPhGyy5sPQwQAhRYN8tBZOtFIz9JX52GIBTAuXehBR1C/JT4pynib/Zjn2AQJjoBW8nR8=
-  AJHklD6iMbHGbKUZWcclT481bufi/3Mww//5HMkyJ2oIo9QPTq0kuXMVI2C73nfSJrYaaGMhqhJGfOO+hcUiWRE=
-  ACKKCJkCwNhmqVz2eCd6VXWsN63K7ZH8FVJ31wLB6EyWfVHu93ZoOf9Y6MvST8zLZ26MRLfF/nCg8AaJSDYwNG8=