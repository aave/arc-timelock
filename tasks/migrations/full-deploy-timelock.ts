import { task } from 'hardhat/config';
import { DRE } from '../../helpers/misc-utils';
import { ArcTimelock__factory } from '../../typechain/factories/ArcTimelock__factory';

const {
  AAVE_SHORT_EXECUTOR,
  ARC_TIMELOCK_GRACE_PERIOD,
  ARC_TIMELOCK_DELAY,
  ARC_TIMELOCK_MINIMUM_DELAY,
  ARC_TIMELOCK_MAXIMUM_DELAY,
  ARC_TIMELOCK_GUARDIAN_ADDRESS,
} = process.env;

task('full:deploy-arc-timelock', 'Deploy ArcTimelock')
  .addFlag('verify')
  .setAction(async ({ verify }, hre) => {
    if (
      !AAVE_SHORT_EXECUTOR ||
      !ARC_TIMELOCK_GRACE_PERIOD ||
      !ARC_TIMELOCK_DELAY ||
      !ARC_TIMELOCK_MINIMUM_DELAY ||
      !ARC_TIMELOCK_MAXIMUM_DELAY ||
      !ARC_TIMELOCK_GUARDIAN_ADDRESS
    ) {
      throw new Error('You have not set correctly the .config.env file, make sure to read the README.md');
    }
    
    await hre.run('set-DRE');

    const arcTimelockAddress = await hre.run('deploy-arc-timelock', {
      defender: process.env.DEFENDER === 'true',
      verify,
      executor: AAVE_SHORT_EXECUTOR,
      gracePeriod: ARC_TIMELOCK_GRACE_PERIOD,
      delay: ARC_TIMELOCK_DELAY,
      minimumDelay: ARC_TIMELOCK_MINIMUM_DELAY,
      maximumDelay: ARC_TIMELOCK_MAXIMUM_DELAY,
      guardian: ARC_TIMELOCK_GUARDIAN_ADDRESS,
    });

    const arcTimelock = ArcTimelock__factory.connect(
      arcTimelockAddress,
      (await (DRE as any).ethers.getSigners())[0]
    );

    console.log('ArcTimelock contract deployed at:', arcTimelockAddress);
    console.log('- EthereumGovernanceExecutor:', await arcTimelock.getEthereumGovernanceExecutor());
    console.log('- Delay:', (await arcTimelock.getDelay()).toString());
    console.log('- MinimumDelay:', (await arcTimelock.getMinimumDelay()).toString());
    console.log('- MaximumDelay:', (await arcTimelock.getMaximumDelay()).toString());
    console.log('- GracePeriod:', (await arcTimelock.getGracePeriod()).toString());
    console.log('- Guardian:', await arcTimelock.getGuardian());
  });
