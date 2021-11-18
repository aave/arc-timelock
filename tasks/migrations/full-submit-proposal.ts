import { task } from 'hardhat/config';
import { DRE } from '../../helpers/misc-utils';
import { IAaveGovernanceV2__factory } from '../../typechain/factories/IAaveGovernanceV2__factory';

const {
  AAVE_GOVERNANCE_ADDRESS,
  AAVE_SHORT_EXECUTOR_ADDRESS,
  ARC_TIMELOCK_ADDRESS,
  PROPOSAL_PAYLOAD_ADDRESS,
  IPFS_ENCODED_HASH,
} = process.env;

task('full:submit-proposal', 'Submit Proposal').setAction(async ({}, hre) => {
  if (
    !AAVE_GOVERNANCE_ADDRESS ||
    !AAVE_SHORT_EXECUTOR_ADDRESS ||
    !ARC_TIMELOCK_ADDRESS ||
    !PROPOSAL_PAYLOAD_ADDRESS ||
    !IPFS_ENCODED_HASH
  ) {
    throw new Error(
      'You have not set correctly the .config.env file, make sure to read the README.md'
    );
  }
  await hre.run('set-DRE');

  const proposalId = await hre.run('submit-proposal', {
    defender: process.env.DEFENDER === 'true',
    timelock: ARC_TIMELOCK_ADDRESS,
    aaveGovernance: AAVE_GOVERNANCE_ADDRESS,
    executor: AAVE_SHORT_EXECUTOR_ADDRESS,
    proposalPayload: PROPOSAL_PAYLOAD_ADDRESS,
    ipfsEncoded: IPFS_ENCODED_HASH,
  });

  const govContract = IAaveGovernanceV2__factory.connect(
    AAVE_GOVERNANCE_ADDRESS,
    (await (DRE as any).ethers.getSigners())[0]
  );
  console.log('Proposal submitted:', await govContract.getProposalById(proposalId));
});
