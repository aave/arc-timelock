import chai, { expect } from 'chai';
import { BigNumber } from 'ethers';
import { solidity } from 'ethereum-waffle';
import {
  DRE,
  advanceBlockTo,
  advanceBlock,
  getImpersonatedSigner,
  evmSnapshot,
  evmRevert,
  setBalance,
  latestBlock,
} from '../helpers/misc-utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { makeSuite, setupTestEnvironment, TestEnv } from './helpers/make-suite';
import {
  expectProposalState,
  triggerWhaleVotes,
  queueProposal,
} from './helpers/governance-helpers';
import {
  ArcTimelock,
  ArcTimelock__factory,
  MarketUpdate,
  MarketUpdate__factory,
  IERC20__factory,
} from '../typechain';
import { GOVERNANCE_PROPOSAL_STATE, AAVE_ADDRESS } from '../helpers/constants';

const hre: HardhatRuntimeEnvironment = require('hardhat');

chai.use(solidity);

// /////////////////
// CONSTANTS
// /////////////////

const { ARC_PERMISSION_MANAGER_ADDRESS, ARC_PERMISSIONED_WETH_GATEWAY_ADDRESS } = process.env;

const ARC_TIMELOCK_CONFIG = {
  DELAY: 172800,
  GRACE_PERIOD: 432000,
  MINIMUM_DELAY: 172800,
  MAXIMUM_DELAY: 172800,
  GUARDIAN_ADDRESS: '0x33B09130b035d6D7e57d76fEa0873d9545FA7557',
};

const PROPOSAL_DETAILS = {
  ARC_POOL_CONFIGURATOR_ADDRESS: process.env.ARC_POOL_CONFIGURATOR_ADDRESS,
  ARC_POOL_ADDRESSES_PROVIDER_ADDRESS: process.env.ARC_POOL_ADDRESSES_PROVIDER_ADDRESS,
  WETH_ADDRESS: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  NEXT_ADMIN: '0x000000000000000000000000000000000000dEaD',
  NEXT_OWNER: '0x0000000000000000000000000000000000000001',
};

// /////////////////

makeSuite('ArcTimelock', setupTestEnvironment, (testEnv: TestEnv) => {
  let marketUpdate: MarketUpdate;
  let arcTimelock: ArcTimelock;
  let ethers;
  let proposal;
  let queuedProposal;

  let timelockTargets;
  let timelockValues;
  let timelockSignatures;
  let timelockCalldatas;
  let timelockWithDelegatecalls;

  before(async () => {
    await hre.run('set-DRE');
    ethers = DRE.ethers;
    console.log('Network:', DRE.network.name);
  });

  describe('ArcTimelock', async function () {
    it('Deploy ArcTimelock', async () => {
      const { aaveWhale1 } = testEnv;

      const arcTimelockAddress = await hre.run('deploy-arc-timelock', {
        defender: false,
        verify: false,
        executor: testEnv.shortExecutor.address,
        gracePeriod: ARC_TIMELOCK_CONFIG.GRACE_PERIOD.toString(),
        delay: ARC_TIMELOCK_CONFIG.DELAY.toString(),
        minimumDelay: ARC_TIMELOCK_CONFIG.MINIMUM_DELAY.toString(),
        maximumDelay: ARC_TIMELOCK_CONFIG.MAXIMUM_DELAY.toString(),
        guardian: ARC_TIMELOCK_CONFIG.GUARDIAN_ADDRESS,
      });

      arcTimelock = ArcTimelock__factory.connect(arcTimelockAddress, aaveWhale1.signer);
      await arcTimelock.deployed();

      expect(await ethers.provider.getCode(arcTimelock.address)).to.not.equal('0x0');
      expect(await arcTimelock.getEthereumGovernanceExecutor()).to.equal(
        testEnv.shortExecutor.address
      );
      expect(await arcTimelock.getDelay()).to.be.equal(ARC_TIMELOCK_CONFIG.DELAY);
      expect(await arcTimelock.getMinimumDelay()).to.be.equal(ARC_TIMELOCK_CONFIG.MINIMUM_DELAY);
      expect(await arcTimelock.getMaximumDelay()).to.be.equal(ARC_TIMELOCK_CONFIG.MAXIMUM_DELAY);
      expect(await arcTimelock.getGuardian()).to.be.equal(ARC_TIMELOCK_CONFIG.GUARDIAN_ADDRESS);
      expect(await arcTimelock.getActionsSetCount()).to.be.equal(BigNumber.from(0));
      await expect(arcTimelock.getCurrentState(BigNumber.from(0))).to.be.revertedWith('INVALID_ACTION_ID');
    });

    it('Release keys of the Market to ArcTimelock', async () => {
      const { lendingPoolAddressesProvider } = testEnv;

      const currentAdminAddress = await lendingPoolAddressesProvider.getPoolAdmin();
      await setBalance(currentAdminAddress, ethers.utils.parseEther('10'));

      await hre.run('transfer-market-keys', {
        defender: false,
        provider: PROPOSAL_DETAILS.ARC_POOL_ADDRESSES_PROVIDER_ADDRESS,
        permissionManager: ARC_PERMISSION_MANAGER_ADDRESS,
        permissionedWethGateway: ARC_PERMISSIONED_WETH_GATEWAY_ADDRESS,
        currentAdmin: currentAdminAddress,
        governanceAdmin: arcTimelock.address,
      });
    });
  });

  describe('Aave Governance Process', async function () {
    it('Deploy Market Update AIP Payload', async () => {
      const { aaveWhale1 } = testEnv;

      await setBalance(aaveWhale1.address, ethers.utils.parseEther('2'));
      marketUpdate = await (await new MarketUpdate__factory(aaveWhale1.signer).deploy()).deployed();

      expect(await ethers.provider.getCode(marketUpdate.address)).to.not.equal('0x0');
      expect(await marketUpdate.ARC_POOL_CONFIGURATOR_ADDRESS()).to.equal(
        PROPOSAL_DETAILS.ARC_POOL_CONFIGURATOR_ADDRESS
      );
      expect(await marketUpdate.ARC_POOL_ADDRESSES_PROVIDER_ADDRESS()).to.equal(
        PROPOSAL_DETAILS.ARC_POOL_ADDRESSES_PROVIDER_ADDRESS
      );
      expect(await marketUpdate.WETH_ADDRESS()).to.equal(PROPOSAL_DETAILS.WETH_ADDRESS);
      expect(await marketUpdate.NEXT_ADMIN()).to.equal(PROPOSAL_DETAILS.NEXT_ADMIN);
      expect(await marketUpdate.NEXT_OWNER()).to.equal(PROPOSAL_DETAILS.NEXT_OWNER);
    });

    it('Create Proposal', async () => {
      const { aaveGovContract, aaveWhale1, shortExecutor } = testEnv;

      // encode data for timelock
      const emptyEncodedData = ethers.utils.defaultAbiCoder.encode(['uint256'], [0]);

      timelockTargets = [marketUpdate.address];
      timelockValues = [BigNumber.from(0)];
      timelockSignatures = ['execute()'];
      timelockCalldatas = [emptyEncodedData];
      timelockWithDelegatecalls = [true];

      // Top Up deployer
      const signer = (await DRE.ethers.getSigners())[0];
      const aave = await IERC20__factory.connect(AAVE_ADDRESS, signer);
      await aave
        .connect(aaveWhale1.signer)
        .transfer(signer.address, await DRE.ethers.utils.parseUnits('80000', 18));

      const proposalId = await hre.run('submit-proposal', {
        defender: false,
        aaveGovernance: aaveGovContract.address,
        executor: shortExecutor.address,
        timelock: arcTimelock.address,
        proposalPayload: marketUpdate.address,
        ipfsEncoded: '0xf7a1f565fcd7684fba6fea5d77c5e699653e21cb6ae25fbf8c5dbc8d694c7949',
      });

      proposal = await aaveGovContract.getProposalById(proposalId);

      await expectProposalState(aaveGovContract, proposal.id, GOVERNANCE_PROPOSAL_STATE.PENDING);
    });

    it('Vote on Proposal', async () => {
      const { aaveWhale1, aaveWhale2, aaveWhale3, aaveGovContract } = testEnv;
      await triggerWhaleVotes(
        aaveGovContract,
        [aaveWhale1.signer, aaveWhale2.signer, aaveWhale3.signer],
        proposal.id,
        true
      );
      await expectProposalState(aaveGovContract, proposal.id, GOVERNANCE_PROPOSAL_STATE.ACTIVE);
    });

    it('Queue Proposal', async () => {
      const { aaveGovContract } = testEnv;
      await advanceBlockTo(proposal.endBlock.add(1));
      queuedProposal = await queueProposal(aaveGovContract, proposal.id);
      await expectProposalState(aaveGovContract, proposal.id, GOVERNANCE_PROPOSAL_STATE.QUEUED);
    });

    it('Execute Proposal', async () => {
      const { aaveGovContract, shortExecutor } = testEnv;

      // advance to execution
      const currentBlock = await ethers.provider.getBlock(await latestBlock());
      const { timestamp } = currentBlock;
      const fastForwardTime = queuedProposal.executionTime.sub(timestamp).toNumber();
      await advanceBlock(timestamp + fastForwardTime + 1);

      const block = await ethers.provider.getBlock(await latestBlock());
      const delay = await shortExecutor.getDelay();
      const expectedExecutionTime = block.timestamp + ARC_TIMELOCK_CONFIG.DELAY + 1;
      await expect(aaveGovContract.execute(proposal.id))
        .to.emit(arcTimelock, 'ActionsSetQueued')
        .withArgs(
          0,
          timelockTargets,
          timelockValues,
          timelockSignatures,
          timelockCalldatas,
          timelockWithDelegatecalls,
          expectedExecutionTime
        )
        .to.emit(shortExecutor, 'ExecutedAction')
        .to.emit(aaveGovContract, 'ProposalExecuted');
    });
  });

  describe('ArcTimelock process', async function () {
    it('Guardian cancels Action Set 0 - cancellation successful', async () => {
      const snapId = await evmSnapshot();

      const guardian = await getImpersonatedSigner(ARC_TIMELOCK_CONFIG.GUARDIAN_ADDRESS);
      await setBalance(ARC_TIMELOCK_CONFIG.GUARDIAN_ADDRESS, ethers.utils.parseEther('10'));
      expect(await arcTimelock.connect(guardian).cancel(0))
        .to.emit(arcTimelock, 'ActionsSetCanceled')
        .withArgs(0);
      await evmRevert(snapId);
    });

    it('Execute Action Set 0 - execution successful', async () => {
      const { aaveWhale1, lendingPoolConfigurator, lendingPoolAddressesProvider } = testEnv;
      const block = await ethers.provider.getBlock('latest');
      await advanceBlock(block.timestamp + ARC_TIMELOCK_CONFIG.DELAY);

      const tx = await arcTimelock.connect(aaveWhale1.signer).execute(0);
      expect(tx)
        .to.emit(arcTimelock, 'ActionsSetExecuted')
        .withArgs(0, ethers.utils.getAddress(aaveWhale1.address), ['0x'])
        .to.emit(lendingPoolConfigurator, 'BorrowingDisabledOnReserve')
        .withArgs(PROPOSAL_DETAILS.WETH_ADDRESS)
        .to.emit(lendingPoolAddressesProvider, 'ConfigurationAdminUpdated')
        .withArgs(PROPOSAL_DETAILS.NEXT_ADMIN)
        .to.emit(lendingPoolAddressesProvider, 'OwnershipTransferred')
        .withArgs(arcTimelock.address, PROPOSAL_DETAILS.NEXT_OWNER);

      expect(await lendingPoolAddressesProvider.getPoolAdmin()).to.be.equal(
        PROPOSAL_DETAILS.NEXT_ADMIN
      );
      expect(await lendingPoolAddressesProvider.owner()).to.be.equal(PROPOSAL_DETAILS.NEXT_OWNER);
    });
  });
});
