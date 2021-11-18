import { task } from 'hardhat/config';
import { Signer } from 'ethers';
import { DRE } from '../../helpers/misc-utils';
import { getDefaultSigner } from '../../helpers/wallet-helpers';
import { logTenderlySimulation } from '../../helpers/tenderly-utils';
import { IAaveGovernanceV2__factory } from '../../typechain';

task(
  'submit-proposal',
  'Submit proposal to the Aave Governance that if passes, queues an action to the Timelock contract.'
)
  .addFlag('defender')
  .addParam('aaveGovernance')
  .addParam('executor')
  .addParam('timelock')
  .addParam('proposalPayload')
  .addParam('ipfsEncoded')
  .setAction(
    async (
      { defender, aaveGovernance, executor, timelock, proposalPayload, ipfsEncoded },
      hre: any
    ) => {
      await hre.run('set-DRE');

      let deployer: Signer;
      [deployer] = await DRE.ethers.getSigners();

      if (defender) {
        deployer = getDefaultSigner('ozd');
      }
      console.log(`Signer: ${await deployer.getAddress()}`);
      console.log(`Balance: ${(await deployer.getBalance()).toString()}`);

      const gov = await IAaveGovernanceV2__factory.connect(aaveGovernance, deployer);
      const proposalId = await gov.getProposalsCount();

      // Payload for Timelock
      const executeSignature = 'execute()';
      const emptyEncodedData = hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [0]);

      // Payload for Governance Proposal
      const queueSignature = 'queue(address[],uint256[],string[],bytes[],bool[])';

      const encodedData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
        [[proposalPayload], ['0'], [executeSignature], [emptyEncodedData], [true]]
      );

      const tx = await gov.create(
        executor, // executor
        [timelock], // targets
        ['0'], // values
        [queueSignature], // signatures
        [encodedData], // calldatas
        [false], // withDelegatecalls
        ipfsEncoded // ipfsHash
      );
      console.log('- Proposal submitted to Governance with id', proposalId.toString());
      console.log('- TransactionHash:', tx.hash);
      await tx.wait();

      logTenderlySimulation();

      return proposalId;
    }
  );
