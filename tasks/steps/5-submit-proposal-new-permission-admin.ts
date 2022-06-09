import { task } from 'hardhat/config';
import { Signer } from 'ethers';
import { DRE } from '../../helpers/misc-utils';
import { getDefaultSigner } from '../../helpers/wallet-helpers';
import { logTenderlySimulation } from '../../helpers/tenderly-utils';
import { IAaveGovernanceV2__factory } from '../../typechain';

task(
  'submit-proposal-new-permission-admin',
  'Submit proposal to the Aave Governance that if passes, queues an action to the Timelock contract.'
)
  .addFlag('defender')
  .addParam('aaveGovernance')
  .addParam('permissionManager')
  .addParam('executor')
  .addParam('timelock')
  .addParam('newPermissionAdmin')
  .addParam('ipfsEncoded')
  .setAction(
    async (
      {
        defender,
        aaveGovernance,
        permissionManager,
        executor,
        timelock,
        newPermissionAdmin,
        ipfsEncoded,
      },
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
      const actionSetExecuteSignature = 'addPermissionAdmins(address[])';
      const actionSetEncodedData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address[]'],
        [[newPermissionAdmin]]
      );

      // Payload for Governance Proposal
      const queueSignature = 'queue(address[],uint256[],string[],bytes[],bool[])';

      const encodedData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
        [[permissionManager], ['0'], [actionSetExecuteSignature], [actionSetEncodedData], [false]]
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
