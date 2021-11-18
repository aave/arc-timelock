import hardhat from 'hardhat';
import chai from 'chai';
import { Signer, BigNumber } from 'ethers';
import { solidity } from 'ethereum-waffle';

import { DRE, getImpersonatedSigner } from '../../helpers/misc-utils';
import { tEthereumAddress } from '../../helpers/types';
import { getAaveGovContract, getAaveShortExecutor } from '../../helpers/contract-getters';
import {
  IAaveGovernanceV2,
  IExecutorWithTimelock,
  LendingPoolConfigurator,
  LendingPoolConfigurator__factory,
  LendingPoolAddressesProvider,
  LendingPoolAddressesProvider__factory,
} from '../../typechain';

chai.use(solidity);

export class ProposalActions {
  targets: tEthereumAddress[];
  values: BigNumber[];
  signatures: string[];
  calldatas: string[];
  withDelegatecalls: boolean[];
  encodedActions: string;
  encodedRootCalldata: string;
  executionTime: number;

  constructor() {
    this.targets = [];
    this.values = [];
    this.signatures = [];
    this.calldatas = [];
    this.withDelegatecalls = [];
    this.encodedRootCalldata = '';
    this.encodedActions = '';
    this.executionTime = 0;
  }
}

export interface SignerWithAddress {
  signer: Signer;
  address: tEthereumAddress;
}

export interface TestEnv {
  aaveWhale1: SignerWithAddress;
  aaveWhale2: SignerWithAddress;
  aaveWhale3: SignerWithAddress;
  previousMarketAdmin: SignerWithAddress;
  aaveGovOwner: SignerWithAddress;
  aaveGovContract: IAaveGovernanceV2;
  shortExecutor: IExecutorWithTimelock;
  proposalActions: ProposalActions[];
  lendingPoolConfigurator: LendingPoolConfigurator;
  lendingPoolAddressesProvider: LendingPoolAddressesProvider;
}

const testEnv: TestEnv = {
  aaveWhale1: {} as SignerWithAddress,
  aaveWhale2: {} as SignerWithAddress,
  aaveWhale3: {} as SignerWithAddress,
  previousMarketAdmin: {} as SignerWithAddress,
  aaveGovOwner: {} as SignerWithAddress,
  aaveGovContract: {} as IAaveGovernanceV2,
  shortExecutor: {} as IExecutorWithTimelock,
  proposalActions: {} as ProposalActions[],
  lendingPoolConfigurator: {} as LendingPoolConfigurator,
  lendingPoolAddressesProvider: {} as LendingPoolAddressesProvider,
} as TestEnv;

const setUpSigners = async (): Promise<void> => {
  const { aaveWhale1, aaveWhale2, aaveWhale3, previousMarketAdmin, aaveGovOwner } = testEnv;
  aaveWhale1.address = '0x4da27a545c0c5b758a6ba100e3a049001de870f5';
  aaveWhale2.address = '0x1d4296c4f14cc5edceb206f7634ae05c3bfc3cb7';
  aaveWhale3.address = '0x7d439999E63B75618b9C6C69d6EFeD0C2Bc295c8';
  previousMarketAdmin.address = '0x438C763B3441215FCd6b7f75434901b74dEd4f53';
  aaveGovOwner.address = '0x61910EcD7e8e942136CE7Fe7943f956cea1CC2f7';

  aaveWhale1.signer = await getImpersonatedSigner(aaveWhale1.address);
  aaveWhale2.signer = await getImpersonatedSigner(aaveWhale2.address);
  aaveWhale3.signer = await getImpersonatedSigner(aaveWhale3.address);
  previousMarketAdmin.signer = await getImpersonatedSigner(previousMarketAdmin.address);
  aaveGovOwner.signer = await getImpersonatedSigner(aaveGovOwner.address);

  const ethWhale = await getImpersonatedSigner('0x26a78d5b6d7a7aceedd1e6ee3229b372a624d8b7');
  await ethWhale.sendTransaction({
    to: aaveGovOwner.address,
    value: DRE.ethers.utils.parseEther('10'),
  });
};

const createGovernanceContracts = async (): Promise<void> => {
  const { aaveGovOwner } = testEnv;

  const { AAVE_GOVERNANCE_ADDRESS, AAVE_SHORT_EXECUTOR_ADDRESS } = process.env;
  // connect to existing Aave Gov and executor
  testEnv.aaveGovContract = await getAaveGovContract(AAVE_GOVERNANCE_ADDRESS, aaveGovOwner.signer);

  testEnv.shortExecutor = await getAaveShortExecutor(
    AAVE_SHORT_EXECUTOR_ADDRESS,
    aaveGovOwner.signer
  );
};

const createMarketContracts = async (): Promise<void> => {
  const { ethers } = DRE;

  const { ARC_POOL_CONFIGURATOR_ADDRESS, ARC_POOL_ADDRESSES_PROVIDER_ADDRESS } = process.env;

  testEnv.lendingPoolConfigurator = LendingPoolConfigurator__factory.connect(
    ARC_POOL_CONFIGURATOR_ADDRESS,
    ethers.provider
  );

  testEnv.lendingPoolAddressesProvider = LendingPoolAddressesProvider__factory.connect(
    ARC_POOL_ADDRESSES_PROVIDER_ADDRESS,
    ethers.provider
  );
};

export const setupTestEnvironment = async (): Promise<void> => {
  await setUpSigners();
  await createGovernanceContracts();
  await createMarketContracts();
};

export async function makeSuite(
  name: string,
  setupFunction: () => Promise<void>,
  tests: (testEnv: TestEnv) => void
): Promise<void> {
  before(async () => {
    await hardhat.run('set-DRE');
    await setupFunction();
    testEnv.proposalActions = [];
  });
  describe(name, async () => {
    tests(testEnv);
  });
  afterEach(async () => {});
}
