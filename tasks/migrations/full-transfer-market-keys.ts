import { task } from 'hardhat/config';
import { DRE } from '../../helpers/misc-utils';
import { ILendingPoolAddressesProvider__factory } from '../../typechain';

const {
  ARC_POOL_ADDRESSES_PROVIDER_ADDRESS,
  ARC_PERMISSION_MANAGER_ADDRESS,
  ARC_PERMISSIONED_WETH_GATEWAY_ADDRESS,
  ARC_TIMELOCK_ADDRESS,
} = process.env;

task('full:transfer-market-keys', 'Transfer market ownership keys').setAction(async ({}, hre) => {
  if (
    !ARC_POOL_ADDRESSES_PROVIDER_ADDRESS ||
    !ARC_PERMISSION_MANAGER_ADDRESS ||
    !ARC_PERMISSIONED_WETH_GATEWAY_ADDRESS ||
    !ARC_TIMELOCK_ADDRESS
  ) {
    throw new Error(
      'You have not set correctly the .config.env file, make sure to read the README.md'
    );
  }

  await hre.run('set-DRE');

  const provider = await ILendingPoolAddressesProvider__factory.connect(
    ARC_POOL_ADDRESSES_PROVIDER_ADDRESS,
    (await (DRE as any).ethers.getSigners())[0]
  );
  const currentAdmin = await provider.getPoolAdmin();

  await hre.run('transfer-market-keys', {
    defender: process.env.DEFENDER === 'true',
    provider: ARC_POOL_ADDRESSES_PROVIDER_ADDRESS,
    permissionManager: ARC_PERMISSION_MANAGER_ADDRESS,
    permissionedWethGateway: ARC_PERMISSIONED_WETH_GATEWAY_ADDRESS,
    currentAdmin,
    governanceAdmin: ARC_TIMELOCK_ADDRESS,
  });
});
