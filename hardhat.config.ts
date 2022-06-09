import { HardhatUserConfig } from 'hardhat/types';
import { accounts } from './helpers/test-wallets';
import { eEthereumNetwork, eNetwork, ePolygonNetwork, eXDaiNetwork } from './helpers/types';
import { HARDHAT_CHAINID, COVERAGE_CHAINID } from './helpers/hardhat-constants';
import { NETWORKS_RPC_URL, NETWORKS_DEFAULT_GAS } from './helper-hardhat-config';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
dotenv.config({ path: '.config.env' });

import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@typechain/hardhat';
import '@tenderly/hardhat-tenderly';
import 'solidity-coverage';
import 'hardhat-dependency-compiler';

const SKIP_LOAD = process.env.SKIP_LOAD === 'true';
if (!SKIP_LOAD) {
  require('./tasks/setup/get-info');
  require('./tasks/setup/print-default-wallets');
  require('./tasks/misc/set-DRE');
  require('./tasks/migrations/full-deploy-proposal-payload');
  require('./tasks/migrations/full-deploy-timelock');
  require('./tasks/migrations/full-submit-proposal');
  require('./tasks/migrations/full-transfer-market-keys');
  require('./tasks/migrations/full-submit-proposal-new-permission-admin');
  require('./tasks/steps/1-deploy-timelock');
  require('./tasks/steps/2-deploy-proposal-payload');
  require('./tasks/steps/3-transfer-market-keys');
  require('./tasks/steps/4-submit-proposal');
  require('./tasks/steps/5-submit-proposal-new-permission-admin');
}

const DEFAULT_BLOCK_GAS_LIMIT = 12450000;
const DEFAULT_GAS_MUL = 5;
const HARDFORK = 'istanbul';
const MNEMONIC_PATH = "m/44'/60'/0'/0";
const MNEMONIC = process.env.MNEMONIC || '';
const FORK_BLOCK_NUMBER = process.env.FORK_BLOCK_NUMBER;
const MAINNET_FORK = process.env.MAINNET_FORK === 'true';
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY || '';
const TENDERLY_PROJECT = process.env.TENDERLY_PROJECT || '';
const TENDERLY_USERNAME = process.env.TENDERLY_USERNAME || '';

const getCommonNetworkConfig = (networkName: eNetwork, networkId: number) => ({
  url: NETWORKS_RPC_URL[networkName],
  hardfork: HARDFORK,
  blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
  gasMultiplier: DEFAULT_GAS_MUL,
  gasPrice: NETWORKS_DEFAULT_GAS[networkName],
  chainId: networkId,
  accounts: {
    mnemonic: MNEMONIC,
    path: MNEMONIC_PATH,
    initialIndex: 0,
    count: 20,
  },
});

const mainnetFork = MAINNET_FORK
  ? {
      blockNumber: Number(FORK_BLOCK_NUMBER) || 13000000,
      url: NETWORKS_RPC_URL['main'],
    }
  : undefined;

// export hardhat config
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: '0.7.5', settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: '0.6.12', settings: { optimizer: { enabled: true, runs: 200 } } },
    ],
  },
  dependencyCompiler: {
    paths: [
      '@aave/governance-v2/contracts/interfaces/IAaveGovernanceV2.sol',
      '@aave/governance-v2/contracts/interfaces/IExecutorWithTimelock.sol',
      '@aave/protocol-v2/contracts/protocol/configuration/LendingPoolAddressesProvider.sol',
      '@aave/protocol-v2/contracts/protocol/configuration/PermissionManager.sol',
      '@aave/protocol-v2/contracts/protocol/lendingpool/LendingPoolConfigurator.sol',
      '@aave/protocol-v2/contracts/interfaces/IPermissionManager.sol',
      '@aave/protocol-v2/contracts/interfaces/IPermissionedLendingPool.sol',
      '@aave/protocol-v2/contracts/misc/PermissionedWETHGateway.sol',
      '@aave/protocol-v2/contracts/misc/AaveOracle.sol',
      '@aave/protocol-v2/contracts/misc/AaveProtocolDataProvider.sol',
    ],
  },
  etherscan: {
    apiKey: ETHERSCAN_KEY,
  },
  tenderly: {
    project: TENDERLY_PROJECT,
    username: TENDERLY_USERNAME,
    forkNetwork: '3030',  // Network id of the network we want to fork
  },
  networks: {
    coverage: {
      url: 'http://localhost:8555',
      chainId: COVERAGE_CHAINID,
    },
    kovan: getCommonNetworkConfig(eEthereumNetwork.kovan, 42),
    ropsten: getCommonNetworkConfig(eEthereumNetwork.ropsten, 3),
    goerli: getCommonNetworkConfig(eEthereumNetwork.goerli, 5),
    main: getCommonNetworkConfig(eEthereumNetwork.main, 1),
    tenderly: getCommonNetworkConfig(eEthereumNetwork.tenderlyMain, 3030),
    matic: getCommonNetworkConfig(ePolygonNetwork.matic, 137),
    mumbai: getCommonNetworkConfig(ePolygonNetwork.mumbai, 80001),
    xdai: getCommonNetworkConfig(eXDaiNetwork.xdai, 100),
    hardhat: {
      hardfork: 'istanbul',
      blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
      gas: DEFAULT_BLOCK_GAS_LIMIT,
      gasPrice: 8000000000,
      chainId: HARDHAT_CHAINID,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      accounts: accounts.map(({ secretKey, balance }: { secretKey: string; balance: string }) => ({
        privateKey: secretKey,
        balance,
      })),
      forking: mainnetFork,
    },
    ganache: {
      url: 'http://ganache:8545',
      accounts: {
        mnemonic: 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm',
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
      },
    },
  },
  mocha: {
    timeout: 500000,
  },
};

export default config;
