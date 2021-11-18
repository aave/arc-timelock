import { Signer } from 'ethers';
import {
  IAaveGovernanceV2,
  IAaveGovernanceV2__factory,
  IExecutorWithTimelock,
  IExecutorWithTimelock__factory,
} from '../typechain';
import { tEthereumAddress } from './types';

export const getAaveGovContract = async (
  address: tEthereumAddress,
  signer: Signer
): Promise<IAaveGovernanceV2> => {
  const aaveGovContract = await IAaveGovernanceV2__factory.connect(address, signer);
  return aaveGovContract;
};

export const getAaveShortExecutor = async (
  address: tEthereumAddress,
  signer: Signer
): Promise<IExecutorWithTimelock> => {
  const aaveExecutor = await IExecutorWithTimelock__factory.connect(address, signer);
  return aaveExecutor;
};
