import { task } from 'hardhat/config';
import { Signer } from 'ethers';
import { DRE } from '../../helpers/misc-utils';
import { getDefaultSigner } from '../../helpers/wallet-helpers';
import { runTaskWithRetry } from '../../helpers/etherscan-verification';
import { EnableArcProposal__factory } from '../../typechain/factories/EnableArcProposal__factory';
import { logTenderlySimulation } from '../../helpers/tenderly-utils';

task('deploy-proposal-payload', 'Deploy the Proposal Payload contract')
  .addFlag('defender')
  .addFlag('verify')
  .setAction(async ({ defender, verify }: { defender: boolean; verify: boolean }, hre) => {
    await hre.run('set-DRE');

    let deployer: Signer;
    [deployer] = await DRE.ethers.getSigners();

    if (defender) {
      deployer = getDefaultSigner('ozd');
    }
    console.log(`Signer: ${await deployer.getAddress()}`);
    console.log(`Balance: ${(await deployer.getBalance()).toString()}`);

    console.log('- Deploying proposal payload');
    const proposalExecutionPayload = await new EnableArcProposal__factory(deployer).deploy();
    await proposalExecutionPayload.deployed();

    console.log('=== INFO ===');
    console.log('Deployed proposal payload at:', proposalExecutionPayload.address, `\n`);

    if (verify) {
      const params = {
        address: proposalExecutionPayload.address,
        constructorArguments: [],
      };
      await runTaskWithRetry('verify:verify', params, 3, 2000, () => {});
    }

    logTenderlySimulation();

    return proposalExecutionPayload.address;
  });
