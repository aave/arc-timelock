import { task } from 'hardhat/config';

task('full:deploy-proposal-payload', 'Deploy Proposal Payload')
  .addFlag('verify')
  .setAction(async ({ verify }, hre) => {
    await hre.run('set-DRE');

    await hre.run('deploy-proposal-payload', {
      defender: process.env.DEFENDER === 'true',
      verify,
    });
  });
