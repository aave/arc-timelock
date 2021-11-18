import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Wallet, ContractTransaction, Signer, ethers, utils, BigNumber } from 'ethers';
import { isZeroAddress } from 'ethereumjs-util';
import { tEthereumAddress } from './types';
import { usingTenderly } from './tenderly-utils';
import { timeStamp } from 'console';

export let DRE: HardhatRuntimeEnvironment;

export const setDRE = (_DRE: HardhatRuntimeEnvironment) => {
  DRE = _DRE;
};

export const sleep = (milliseconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

export const createRandomAddress = () => Wallet.createRandom().address;

export const evmSnapshot = async () => await DRE.ethers.provider.send('evm_snapshot', []);

export const evmRevert = async (id: string) => DRE.ethers.provider.send('evm_revert', [id]);

export const advanceBlock = async (timestamp: number) =>
  await DRE.ethers.provider.send('evm_mine', [timestamp]);

export const increaseTime = async (secondsToIncrease: number) => {
  if (usingTenderly()) {
    await DRE.ethers.provider.send('evm_increaseTime', [`0x${secondsToIncrease.toString(16)}`]);
    console.log(`[Time Travel] Increased ${secondsToIncrease} the current block timestamp`);
    return;
  }

  await DRE.ethers.provider.send('evm_increaseTime', [secondsToIncrease]);
  await DRE.ethers.provider.send('evm_mine', []);
};

// Workaround for time travel tests bug: https://github.com/Tonyhaenn/hh-time-travel/blob/0161d993065a0b7585ec5a043af2eb4b654498b8/test/test.js#L12
export const advanceTimeAndBlock = async function (forwardTime: number) {
  const currentBlockNumber = await DRE.ethers.provider.getBlockNumber();
  const currentBlock = await DRE.ethers.provider.getBlock(currentBlockNumber);

  if (currentBlock === null) {
    /* Workaround for https://github.com/nomiclabs/hardhat/issues/1183
     */
    await DRE.ethers.provider.send('evm_increaseTime', [forwardTime]);
    await DRE.ethers.provider.send('evm_mine', []);
    //Set the next blocktime back to 15 seconds
    await DRE.ethers.provider.send('evm_increaseTime', [15]);
    return;
  }
  const currentTime = currentBlock.timestamp;
  const futureTime = currentTime + forwardTime;
  await DRE.ethers.provider.send('evm_setNextBlockTimestamp', [futureTime]);
  await DRE.ethers.provider.send('evm_mine', []);
};

export const latestBlock = async () =>
  parseInt((await DRE.ethers.provider.send('eth_getBlockByNumber', ['latest', false])).number);

export const advanceBlockTo = async (target: number) => {
  const currentBlock = await latestBlock();
  if (usingTenderly()) {
    const pendingBlocks = target - currentBlock - 1;
    await DRE.ethers.provider.send('evm_increaseBlocks', [`0x${pendingBlocks.toString(16)}`]);
    console.log('[Time Travel] Moved from block', currentBlock, 'to block', await latestBlock());
    return;
  }

  const start = Date.now();
  let notified;
  if (target < currentBlock)
    throw Error(`Target block #(${target}) is lower than current block #(${currentBlock})`);
  // eslint-disable-next-line no-await-in-loop
  while ((await latestBlock()) < target) {
    if (!notified && Date.now() - start >= 5000) {
      notified = true;
      console.log("advanceBlockTo: Advancing too many blocks is causing this test to be slow.'");
    }
    // eslint-disable-next-line no-await-in-loop
    await advanceBlock(0);
  }
};

export const waitForTx = async (tx: ContractTransaction) => await tx.wait(1);

export const filterMapBy = (raw: { [key: string]: any }, fn: (key: string) => boolean) =>
  Object.keys(raw)
    .filter(fn)
    .reduce<{ [key: string]: any }>((obj, key) => {
      obj[key] = raw[key];
      return obj;
    }, {});

export const chunk = <T>(arr: Array<T>, chunkSize: number): Array<Array<T>> => {
  return arr.reduce(
    (prevVal: any, currVal: any, currIndx: number, array: Array<T>) =>
      !(currIndx % chunkSize)
        ? prevVal.concat([array.slice(currIndx, currIndx + chunkSize)])
        : prevVal,
    []
  );
};

interface DbEntry {
  [network: string]: {
    deployer: string;
    address: string;
  };
}

export const getImpersonatedSigner = async (address: tEthereumAddress): Promise<Signer> => {
  if (!usingTenderly()) {
    await DRE.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [address],
    });
  }
  return await DRE.ethers.getSigner(address);
};

export const setBalance = async (account: string, balance: ethers.BigNumber) => {
  if (DRE.network.name === 'hardhat') {
    await DRE.network.provider.send('hardhat_setBalance', [account, balance.toHexString()]);
  }
};

export const notFalsyOrZeroAddress = (address: tEthereumAddress | null | undefined): boolean => {
  if (!address) {
    return false;
  }
  return utils.isAddress(address) && !isZeroAddress(address);
};
