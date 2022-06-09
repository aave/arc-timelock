import { task } from 'hardhat/config';
import { DRE } from '../../helpers/misc-utils';
import { IAaveGovernanceV2__factory } from '../../typechain/factories/IAaveGovernanceV2__factory';

const {
  AAVE_GOVERNANCE_ADDRESS,
  AAVE_SHORT_EXECUTOR_ADDRESS,
  ARC_PERMISSION_MANAGER_ADDRESS,
  ARC_TIMELOCK_ADDRESS,
} = process.env;

task('full:submit-proposal-new-permission-admin', 'Submit Proposal')
  .addParam('admin', 'Address of the new PermissionAdmin to add')
  .addParam('ipfs', 'IPFS encoded hash')
  .setAction(async ({ admin, ipfs }, hre) => {
    if (
      !AAVE_GOVERNANCE_ADDRESS ||
      !AAVE_SHORT_EXECUTOR_ADDRESS ||
      !ARC_TIMELOCK_ADDRESS ||
      !ARC_PERMISSION_MANAGER_ADDRESS
    ) {
      throw new Error(
        'You have not set correctly the .config.env file, make sure to read the README.md'
      );
    }
    await hre.run('set-DRE');

    const proposalId = await hre.run('submit-proposal-new-permission-admin', {
      defender: process.env.DEFENDER === 'true',
      aaveGovernance: AAVE_GOVERNANCE_ADDRESS,
      permissionManager: ARC_PERMISSION_MANAGER_ADDRESS,
      executor: AAVE_SHORT_EXECUTOR_ADDRESS,
      timelock: ARC_TIMELOCK_ADDRESS,
      newPermissionAdmin: admin,
      ipfsEncoded: ipfs,
    });

    const govContract = IAaveGovernanceV2__factory.connect(
      AAVE_GOVERNANCE_ADDRESS,
      (await (DRE as any).ethers.getSigners())[0]
    );
    console.log('Proposal submitted:', await govContract.getProposalById(proposalId));
    return proposalId;
  });
