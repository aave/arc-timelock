import { task } from 'hardhat/config';
import { Signer } from 'ethers';
import { DRE } from '../../helpers/misc-utils';
import { tEthereumAddress } from '../../helpers/types';
import { getDefaultSigner } from '../../helpers/wallet-helpers';
import { runTaskWithRetry } from '../../helpers/etherscan-verification';
import { ArcTimelock__factory } from '../../typechain/factories/ArcTimelock__factory';
import { logTenderlySimulation } from '../../helpers/tenderly-utils';

interface ArcTimelockDeployParams {
  defender: boolean;
  verify: boolean;
  executor: tEthereumAddress;
  gracePeriod: string;
  delay: string;
  minimumDelay: string;
  maximumDelay: string;
  guardian: tEthereumAddress;
}

task('deploy-arc-timelock', 'Deploy ArcTimelock')
  .addFlag('defender')
  .addFlag('verify')
  .addParam('executor')
  .addParam('gracePeriod')
  .addParam('minimumDelay')
  .addParam('delay')
  .addParam('maximumDelay')
  .addParam('guardian')
  .setAction(
    async (
      {
        defender,
        verify,
        executor,
        delay,
        gracePeriod,
        minimumDelay,
        maximumDelay,
        guardian,
      }: ArcTimelockDeployParams,
      hre
    ) => {
      await hre.run('set-DRE');

      let deployer: Signer;
      [deployer] = await DRE.ethers.getSigners();

      if (defender) {
        deployer = getDefaultSigner('ozd');
      }
      console.log(`Signer: ${await deployer.getAddress()}`);
      console.log(`Balance: ${(await deployer.getBalance()).toString()}`);

      const constructorArguments: [string, string, string, string, string, string] = [
        executor,
        delay,
        gracePeriod,
        minimumDelay,
        maximumDelay,
        guardian,
      ];

      console.log('- Deploying ArcTimelock contract');
      const arcTimelock = await new ArcTimelock__factory(deployer).deploy(
        ...constructorArguments
      );
      await arcTimelock.deployed();

      if (verify) {
        const params = {
          address: arcTimelock.address,
          constructorArguments,
        };
        await runTaskWithRetry('verify:verify', params, 3, 2000, () => {});
      }

      console.log('=== INFO ===');
      console.log('Deployed Timelock contract at:', arcTimelock.address, `\n`);

      logTenderlySimulation();

      return arcTimelock.address;
    }
  );
