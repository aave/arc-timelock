import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { BigNumber, utils } from 'ethers';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  AaveOracle,
  AaveProtocolDataProvider,
  AaveProtocolDataProvider__factory,
  IERC20__factory,
  IPermissionedLendingPool,
  IPermissionedLendingPool__factory,
  AaveOracle__factory,
  PermissionManager,
  PermissionManager__factory,
  ArcTimelock,
  ArcTimelock__factory,
  IAaveGovernanceV2,
  IAaveGovernanceV2__factory,
  IExecutorWithTimelock,
  IExecutorWithTimelock__factory,
  LendingPoolAddressesProvider,
  LendingPoolAddressesProvider__factory,
} from '../typechain';
import {
  DRE,
  getImpersonatedSigner,
  setBalance,
  waitForTx,
  advanceBlock,
  advanceBlockTo,
  increaseTime,
} from '../helpers/misc-utils';
import { parseEther } from 'ethers/lib/utils';
import {
  AAVE_ADDRESS,
  GOVERNANCE_PROPOSAL_STATE,
  MAX_UINT_AMOUNT,
  PERMISSIONED_MANAGER_PERMISSION,
  WETH_ADDRESS,
} from '../helpers/constants';
import { queueProposal, triggerWhaleVotes } from './helpers/governance-helpers';

const hre: HardhatRuntimeEnvironment = require('hardhat');

chai.use(solidity);

// /////////////////
// CONSTANTS
// /////////////////

const AAVE_WHALE_ADDRESS = '0x4da27a545c0c5B758a6BA100e3a049001de870f5';
const WETH_WHALE_ADDRESS = '0x2f0b23f53734252bda2277357e97e1517d6b042a';

const {
  AAVE_GOVERNANCE_ADDRESS,
  AAVE_SHORT_EXECUTOR_ADDRESS,
  ARC_PERMISSIONED_POOL_ADDRESS,
  ARC_PERMISSIONED_WETH_GATEWAY_ADDRESS,
  ARC_AAVE_PROTOCOL_DATA_PROVIDER_ADDRESS,
  ARC_TIMELOCK_ADDRESS,
} = process.env;

const ARC_TIMELOCK_CONFIG = {
  DELAY: process.env.ARC_TIMELOCK_DELAY,
  GRACE_PERIOD: process.env.ARC_TIMELOCK_GRACE_PERIOD,
  MINIMUM_DELAY: process.env.ARC_TIMELOCK_MINIMUM_DELAY,
  MAXIMUM_DELAY: process.env.ARC_TIMELOCK_MAXIMUM_DELAY,
  GUARDIAN_ADDRESS: process.env.ARC_TIMELOCK_GUARDIAN_ADDRESS,
};

const PROPOSAL_DETAILS = {
  ARC_POOL_ADDRESSES_PROVIDER_ADDRESS: process.env.ARC_POOL_ADDRESSES_PROVIDER_ADDRESS,
  ARC_POOL_CONFIGURATOR_ADDRESS: process.env.ARC_POOL_CONFIGURATOR_ADDRESS,
  ARC_PERMISSION_MANAGER_ADDRESS: process.env.ARC_PERMISSION_MANAGER_ADDRESS,
  FIREBLOCKS_ADDRESS: process.env.FIREBLOCKS_ADDRESS,
  ARC_TIMELOCK_VETO_DAO_ADDRESS: process.env.ARC_TIMELOCK_GUARDIAN_ADDRESS,
};

const NEW_PERMISSION_ADMIN = '0x829BD824B016326A401d083B33D092293333A830';

// /////////////////

interface Token {
  name: string;
  address: string;
  whale: string;
  decimals: number;
}

const WETH: Token = {
  name: 'WETH',
  address: WETH_ADDRESS,
  decimals: 18,
  whale: WETH_WHALE_ADDRESS,
};

const tokens: {
  [key: string]: Token;
} = {
  WETH,
};

describe('ARC: New PermissionAdmin', () => {
  let user: SignerWithAddress;
  let externalUser: SignerWithAddress;

  let pool: IPermissionedLendingPool;
  let provider: LendingPoolAddressesProvider;
  let dataProvider: AaveProtocolDataProvider;
  let oracle: AaveOracle;
  let permissionManager: PermissionManager;
  let governance: IAaveGovernanceV2;
  let executor: IExecutorWithTimelock;
  let arcTimelock: ArcTimelock;

  let proposal, queuedProposal;
  let actionsSetId;

  before(async () => {
    await hre.run('set-DRE');
    console.log('Network:', DRE.network.name);

    [user, , externalUser] = await DRE.ethers.getSigners();

    // Top up signers
    await setBalance(user.address, utils.parseEther('10'));
    await setBalance(externalUser.address, utils.parseEther('10'));

    // Contracts
    pool = IPermissionedLendingPool__factory.connect(ARC_PERMISSIONED_POOL_ADDRESS, user);
    provider = LendingPoolAddressesProvider__factory.connect(
      PROPOSAL_DETAILS.ARC_POOL_ADDRESSES_PROVIDER_ADDRESS,
      user
    );
    dataProvider = await AaveProtocolDataProvider__factory.connect(
      ARC_AAVE_PROTOCOL_DATA_PROVIDER_ADDRESS,
      user
    );
    const oracleAddress = await provider.getPriceOracle();
    oracle = await AaveOracle__factory.connect(oracleAddress, user);
    permissionManager = await PermissionManager__factory.connect(
      PROPOSAL_DETAILS.ARC_PERMISSION_MANAGER_ADDRESS,
      user
    );
    governance = await IAaveGovernanceV2__factory.connect(AAVE_GOVERNANCE_ADDRESS, user);
    executor = await IExecutorWithTimelock__factory.connect(AAVE_SHORT_EXECUTOR_ADDRESS, user);
    arcTimelock = ArcTimelock__factory.connect(ARC_TIMELOCK_ADDRESS, user);
  });

  it('Fund signer with proposition power', async () => {
    await setBalance(AAVE_WHALE_ADDRESS, utils.parseEther('10'));
    const aaveWhale = await getImpersonatedSigner(AAVE_WHALE_ADDRESS);
    const aave = await IERC20__factory.connect(AAVE_ADDRESS, user);
    await aave.connect(aaveWhale).transfer(user.address, await utils.parseUnits('80000', 18));
  });

  it('Submit Proposal', async () => {
    const proposalId = await hre.run('submit-proposal-new-permission-admin', {
      defender: false,
      aaveGovernance: AAVE_GOVERNANCE_ADDRESS,
      permissionManager: PROPOSAL_DETAILS.ARC_PERMISSION_MANAGER_ADDRESS,
      executor: AAVE_SHORT_EXECUTOR_ADDRESS,
      timelock: arcTimelock.address,
      newPermissionAdmin: NEW_PERMISSION_ADMIN,
      ipfsEncoded: '0xf7a1f565fcd7684fba6fea5d77c5e699653e21cb6ae25fbf8c5dbc8d694c7949',
    });

    proposal = await governance.getProposalById(proposalId);

    // Mine 1 block so proposal is ACTIVE
    await increaseTime(1);
    expect(await governance.getProposalState(proposalId)).to.be.eq(
      GOVERNANCE_PROPOSAL_STATE.ACTIVE
    );
  });

  it('Vote on Proposal', async () => {
    const aaveWhale1 = await getImpersonatedSigner(AAVE_WHALE_ADDRESS);

    await triggerWhaleVotes(governance, [aaveWhale1], proposal.id, true);
  });

  it('Queue Proposal', async () => {
    await advanceBlockTo(proposal.endBlock.add(1).toNumber());
    queuedProposal = await queueProposal(governance, proposal.id);
    expect(await governance.getProposalState(proposal.id)).to.be.eq(
      GOVERNANCE_PROPOSAL_STATE.QUEUED
    );
  });

  it('Execute Proposal', async () => {
    // advance to execution
    const currentBlock = await DRE.ethers.provider.getBlock('latest');
    const { timestamp } = currentBlock;
    const fastForwardTime = queuedProposal.executionTime.sub(timestamp).toNumber();
    await advanceBlock(timestamp + fastForwardTime + 10);

    actionsSetId = await arcTimelock.getActionsSetCount();
    await expect(governance.execute(proposal.id))
      .to.emit(arcTimelock, 'ActionsSetQueued')
      .to.emit(executor, 'ExecutedAction')
      .to.emit(governance, 'ProposalExecuted');
  });

  it('Execute ActionSet', async () => {
    const block = await DRE.ethers.provider.getBlock('latest');
    await advanceBlock(block.timestamp + Number.parseInt(ARC_TIMELOCK_CONFIG.DELAY, 10));

    const tx = await arcTimelock.connect(user).execute(actionsSetId);
    await expect(tx)
      .to.emit(arcTimelock, 'ActionsSetExecuted')
      .withArgs(actionsSetId, await user.getAddress(), ['0x'])
      .to.emit(permissionManager, 'PermissionsAdminSet')
      .withArgs(NEW_PERMISSION_ADMIN, true);

    expect(await permissionManager.isPermissionsAdmin(NEW_PERMISSION_ADMIN)).to.be.true;
  });

  it('Check proposal execution', async () => {
    expect(await permissionManager.isPermissionsAdmin(NEW_PERMISSION_ADMIN)).to.be.true;
  });

  it('New PermissionAdmin adds permissions to signer', async () => {
    const newPermissionAdmin = await getImpersonatedSigner(NEW_PERMISSION_ADMIN);
    await setBalance(NEW_PERMISSION_ADMIN, utils.parseEther('10'));
    await waitForTx(
      await permissionManager
        .connect(newPermissionAdmin)
        .addPermissions(
          [PERMISSIONED_MANAGER_PERMISSION.DEPOSITOR, PERMISSIONED_MANAGER_PERMISSION.BORROWER],
          [await user.getAddress(), await user.getAddress()]
        )
    );
    expect(
      await permissionManager.isInRole(
        await user.getAddress(),
        PERMISSIONED_MANAGER_PERMISSION.DEPOSITOR
      )
    ).to.be.true;
    expect(
      await permissionManager.isInRole(
        await user.getAddress(),
        PERMISSIONED_MANAGER_PERMISSION.BORROWER
      )
    ).to.be.true;
  });

  it('No-whitelisted user tries to interact (revert expected)', async () => {
    // Transfer assets to proposer from reserve holder
    const wethWhale = await getImpersonatedSigner(WETH.whale);
    await setBalance(WETH.whale, utils.parseEther('10'));
    const reserve = IERC20__factory.connect(WETH.address, externalUser);
    await waitForTx(
      await reserve.connect(wethWhale).transfer(externalUser.address, utils.parseEther('1'))
    );

    // Approve
    await waitForTx(await reserve.approve(pool.address, MAX_UINT_AMOUNT));
    // Interact
    try {
      await pool
        .connect(externalUser)
        .deposit(reserve.address, utils.parseEther('1'), externalUser.address, 0);
      expect(false, 'Test should never reach here due revert').to.be.true;
    } catch {}
  });

  it('fullCycleLendingPool', async () => {
    const tokenNames = Object.keys(tokens);
    for (let i = 0; i < tokenNames.length; i++) {
      await fullCycleLendingPool(tokens[tokenNames[i]], WETH, user, pool, dataProvider, oracle);
    }
  });
});

const fullCycleLendingPool = async (
  depositToken: Token,
  borrowToken: Token,
  user: SignerWithAddress,
  pool: IPermissionedLendingPool,
  dataProvider: AaveProtocolDataProvider,
  oracle: AaveOracle
) => {
  const { aTokenAddress } = await pool.getReserveData(depositToken.address);
  const reserve = IERC20__factory.connect(depositToken.address, user);
  const aToken = IERC20__factory.connect(aTokenAddress, user);
  const borrow = IERC20__factory.connect(borrowToken.address, user);

  const holderSigner = await getImpersonatedSigner(depositToken.whale);
  const wethSigner = await getImpersonatedSigner(borrowToken.whale);

  const data = await dataProvider.getReserveConfigurationData(depositToken.address);
  const price = await oracle.getAssetPrice(depositToken.address);
  const ETH_VAL = BigNumber.from(10).pow(18);

  const balance = await reserve.balanceOf(depositToken.whale);
  // Amounts
  const transferAmount = balance.div(3);
  const depositAmount = balance.div(3);
  const borrowAmount = depositAmount.mul(price).div(ETH_VAL).mul(data.ltv).div(10000);

  console.log(
    `Initiate full cycle for ${depositToken.name} with LTV: ${utils.formatUnits(
      data.ltv,
      2
    )}% at price: ${utils.formatEther(price)}`
  );

  // Transfer assets to proposer from reserve holder
  await waitForTx(await reserve.connect(holderSigner).transfer(user.address, transferAmount));
  await waitForTx(await borrow.connect(wethSigner).transfer(user.address, parseEther('100')));

  // Deposit to LendingPool
  await waitForTx(await reserve.connect(user).approve(pool.address, depositAmount));
  const tx1 = await pool.connect(user).deposit(reserve.address, depositAmount, user.address, 0);
  await waitForTx(tx1);
  expect(tx1).to.emit(pool, 'Deposit');
  console.log(
    `\tDeposited ${utils.formatUnits(depositAmount, depositToken.decimals)} ${depositToken.name}`
  );

  // Request loan to LendingPool
  const tx2 = await pool.connect(user).borrow(borrow.address, borrowAmount, '2', '0', user.address);
  await waitForTx(tx2);
  expect(tx2).to.emit(pool, 'Borrow');
  console.log(`\tBorrowed ${utils.formatEther(borrowAmount)} WETH`);

  // Repay variable loan to LendingPool
  await waitForTx(await borrow.connect(user).approve(pool.address, MAX_UINT_AMOUNT));
  await waitForTx(
    await pool.connect(user).repay(borrow.address, MAX_UINT_AMOUNT, '2', user.address)
  );
  console.log(`\tRepaid WETH`);

  // Withdraw from LendingPool
  const priorBalance = await reserve.balanceOf(user.address);
  await waitForTx(await aToken.connect(user).approve(pool.address, MAX_UINT_AMOUNT));
  await waitForTx(
    await pool.connect(user).withdraw(reserve.address, MAX_UINT_AMOUNT, user.address)
  );
  const afterBalance = await reserve.balanceOf(user.address);
  console.log(
    `\tWithdrew ${utils.formatUnits(afterBalance, depositToken.decimals)} ${depositToken.name}`
  );
  expect(await aToken.balanceOf(user.address)).to.be.eq('0');
  expect(afterBalance).to.be.gt(priorBalance);

  console.log(`\tCompleted`);
};
