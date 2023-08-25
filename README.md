# zkSync Diamond Proxy ERC1155

This project was scaffolded with [zksync-cli](https://github.com/matter-labs/zksync-cli).

## Project structure

- `/contracts`: smart contracts.
- `/deploy`: deployment and contract interaction scripts.
- `/test`: test files
- `hardhat.config.ts`: configuration file.

## Quickstart

- `yarn hardhat compile` will compile the contracts.
- `yarn run deploy` will execute the deployment script `/deploy/deploy-greeter.ts`. Requires [environment variable setup](#environment-variables).
- `yarn test`: run tests. **Check test requirements below.**

### Environment variables

Rename `.env.example` to `.env` and enter your private key. This is needed for deployment

### Local testing

In order to run test, you need to start the zkSync local environment. Please check [this section of the docs](https://v2-docs.zksync.io/api/hardhat/testing.html#prerequisites) which contains all the details.

In summary:
1. First install `era-test-node` (see above link)
2. Start node in terminal with `era_test_node --port 3050 run`. Set the port to 3050 as this is the default HardHat configuration
3. Run `yarn test` from another terminal

zkSync hardhat does not spin its own node when executing tests, making steps 1 and 2 necessary

# Overview of Implementation
## Design Choices

- Each address can only mint 1 token of a particular ID, including the admin. However:
- The requirements stated that 'The minting function must only accept URIs that end with a .glb file extension', though it is assumed that setting the token URI should be restricted. This is used as a mechanism to dictate how many different types of tokens exist in the collection. The admin is required to make the initial mint by passing in the URI extension for that token ID, effectively 'activating' the token ID for minting by others.
- All token IDs share a base URI, with individual IDs having their own extension (with .glb).
- The base URI can be changed. This is for when the IPFS content hash changes when adding more items to the collection. The extension URI cannot as there is no need.
- Implemented as a free mint

## Security

- Re-entrancy can only occur from the `_doSafeTransferAcceptanceCheck` and `_doSafeBatchTransferAcceptanceCheck` hooks, though this is only called after all state changes (checks-effects-interactions pattern), so reentrancy guard is not needed here. Other protocols should still be aware of cross-contract or view-only reentrancy

## Deployment Addresses:
- DiamondCutFacet: 0x9a4AAad19026eD1ef8481D6355ca3711a9045b9B
- DiamondLoupeFacet: 0x121dA47A5b0848089ED55A2F29E45476e0283256
- ERC1155Facet: 0x9Cf618965eF8B04d75B7d3ceB7Cf4D7dcdcc78ed
- ERC1155HolderMock: 0x624Fd7DB48D310696ab981e70B803387011d7B4D
- Main Diamond Proxy: 0x6220Df8eC674BE62aC200414d6cF8508027A9Cd8
