import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Signer } from 'ethers';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import {
  PermissionManager,
  PermissionManager__factory,
  LendingPoolAddressesProvider__factory,
  LendingPoolAddressesProvider,
  AaveOracle__factory,
  Ownable__factory,
  PermissionedWETHGateway__factory,
  AaveOracle,
  PermissionedWETHGateway,
  Ownable,
} from '../typechain';
import { DRE, getImpersonatedSigner, setBalance } from '../helpers/misc-utils';

const hre: HardhatRuntimeEnvironment = require('hardhat');

chai.use(solidity);

// /////////////////
// CONSTANTS
// /////////////////

const {
  ARC_POOL_ADDRESSES_PROVIDER_ADDRESS,
  ARC_PERMISSION_MANAGER_ADDRESS,
  ARC_TIMELOCK_ADDRESS,
  ARC_PERMISSIONED_WETH_GATEWAY_ADDRESS,
} = process.env;

const SIGNER_ADDRESS = '0x438C763B3441215FCd6b7f75434901b74dEd4f53';

// /////////////////

describe('Transfer ARC keys', () => {
  let ethers;

  let provider: LendingPoolAddressesProvider;
  let permissionManager: PermissionManager;
  let oracle: AaveOracle;
  let lendingRateOracle: Ownable;
  let wethGateway: PermissionedWETHGateway;
  let signer: Signer;

  before(async () => {
    await hre.run('set-DRE');
    ethers = DRE.ethers;
    console.log('Network:', DRE.network.name);

    // Top up signers
    signer = await getImpersonatedSigner(SIGNER_ADDRESS);
    await setBalance(await signer.getAddress(), ethers.utils.parseEther('10'));

    // Contracts
    provider = LendingPoolAddressesProvider__factory.connect(
      ARC_POOL_ADDRESSES_PROVIDER_ADDRESS,
      signer
    );
    permissionManager = await PermissionManager__factory.connect(
      ARC_PERMISSION_MANAGER_ADDRESS,
      signer
    );
    const oracleAddress = await provider.getPriceOracle();
    oracle = await AaveOracle__factory.connect(oracleAddress, signer);
    const lendingRateOracleAddress = await provider.getLendingRateOracle();
    lendingRateOracle = await Ownable__factory.connect(lendingRateOracleAddress, signer);
    wethGateway = await PermissionedWETHGateway__factory.connect(
      ARC_PERMISSIONED_WETH_GATEWAY_ADDRESS,
      signer
    );
  });

  it('Release keys', async () => {
    const currentAdminAddress = await provider.getPoolAdmin();
    expect(currentAdminAddress).to.be.eq(SIGNER_ADDRESS);

    await hre.run('full:transfer-market-keys');

    // LendingPoolAddressesProvider
    expect(await provider.owner()).to.be.equal(ARC_TIMELOCK_ADDRESS);
    expect(await provider.getPoolAdmin()).to.be.equal(ARC_TIMELOCK_ADDRESS);
    expect(await provider.getEmergencyAdmin()).to.be.equal(ARC_TIMELOCK_ADDRESS);
    // PermissionManager
    expect(await permissionManager.owner()).to.be.equal(ARC_TIMELOCK_ADDRESS);
    // AaveOracle
    expect(await oracle.owner()).to.be.equal(ARC_TIMELOCK_ADDRESS);
    // LendingRateOracle
    expect(await lendingRateOracle.owner()).to.be.equal(ARC_TIMELOCK_ADDRESS);
    // PermissionedWethGateway
    expect(await wethGateway.owner()).to.be.equal(ARC_TIMELOCK_ADDRESS);
  });
});
