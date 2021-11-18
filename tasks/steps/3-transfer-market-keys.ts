import { task } from 'hardhat/config';
import { Signer } from 'ethers';
import { DRE, getImpersonatedSigner, waitForTx } from '../../helpers/misc-utils';
import { getDefaultSigner } from '../../helpers/wallet-helpers';
import { logTenderlySimulation } from '../../helpers/tenderly-utils';
import {
  Ownable__factory,
  AaveOracle__factory,
  LendingPoolAddressesProvider__factory,
  PermissionedWETHGateway__factory,
  PermissionManager__factory,
} from '../../typechain';

task('transfer-market-keys', 'Transfer market ownership keys')
  .addFlag('defender')
  .addParam('provider')
  .addParam('permissionManager')
  .addParam('permissionedWethGateway')
  .addParam('currentAdmin')
  .addParam('governanceAdmin')
  .setAction(
    async (
      {
        defender,
        provider,
        permissionedWethGateway: permissionedWethGatewayAddress,
        permissionManager: permissionManagerAddress,
        currentAdmin,
        governanceAdmin,
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

      // Use the current admin in testnet local fork
      if (hre.network.name === 'hardhat' || hre.network.name === 'tenderly') {
        console.log(`Using ${currentAdmin} as impersonated signer.`);
        deployer = await getImpersonatedSigner(currentAdmin);
      }
      console.log('=== Transfer ownership of Market ===');

      // Instances
      const lendingPoolAddressesProvider = await LendingPoolAddressesProvider__factory.connect(
        provider,
        deployer
      );
      const permissionManager = await PermissionManager__factory.connect(
        permissionManagerAddress,
        deployer
      );
      const oracleAddress = await lendingPoolAddressesProvider.getPriceOracle();
      const oracle = await AaveOracle__factory.connect(oracleAddress, deployer);
      const lendingRateOracleAddress = await lendingPoolAddressesProvider.getLendingRateOracle();
      const lendingRateOracle = await Ownable__factory.connect(lendingRateOracleAddress, deployer);
      const wethGateway = await PermissionedWETHGateway__factory.connect(
        permissionedWethGatewayAddress,
        deployer
      );

      // Transfer contracts ownerships to "governanceAdmin"
      // LendingPoolAddressesProvider
      await waitForTx(await lendingPoolAddressesProvider.setPoolAdmin(governanceAdmin));
      await waitForTx(await lendingPoolAddressesProvider.setEmergencyAdmin(governanceAdmin));
      await waitForTx(await lendingPoolAddressesProvider.transferOwnership(governanceAdmin));
      // PermissionManager
      await waitForTx(await permissionManager.transferOwnership(governanceAdmin));
      // AaveOracle
      await waitForTx(await oracle.transferOwnership(governanceAdmin));
      // LendingRateOracle
      await waitForTx(await lendingRateOracle.transferOwnership(governanceAdmin));
      // PermissionedWethGateway
      await waitForTx(await wethGateway.transferOwnership(governanceAdmin));

      console.log('Successfully changed the ownership of the next contracts:');
      console.log(' AddressesProvider at:', lendingPoolAddressesProvider.address);
      console.log('  - Pool admin:', await lendingPoolAddressesProvider.getPoolAdmin());
      console.log('  - Emergency admin:', await lendingPoolAddressesProvider.getEmergencyAdmin());
      console.log('  - Owner:', await lendingPoolAddressesProvider.owner());
      console.log(' PermissionManager at:', permissionManager.address);
      console.log('  - Owner:', await permissionManager.owner());
      console.log(' AaveOracle at:', oracle.address);
      console.log('  - Owner:', await oracle.owner());
      console.log(' LendingRateOracle at:', lendingRateOracle.address);
      console.log('  - Owner:', await lendingRateOracle.owner());
      console.log(' PermissionedWethGateway at:', wethGateway.address);
      console.log('  - Owner:', await wethGateway.owner());
      console.log();

      logTenderlySimulation();
    }
  );
