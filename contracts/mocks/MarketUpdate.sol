//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

import {ILendingPoolAddressesProvider} from '@aave/protocol-v2/contracts/interfaces/ILendingPoolAddressesProvider.sol';
import {Ownable} from '@aave/protocol-v2/contracts/dependencies/openzeppelin/contracts/Ownable.sol';

interface ILendingPoolConfiguratorSimple {
  function disableBorrowingOnReserve(address asset) external;
}

interface IProposalExecutor {
  function execute() external;
}

contract MarketUpdate is IProposalExecutor {
  address public constant ARC_POOL_CONFIGURATOR_ADDRESS =
    0x4e1c7865e7BE78A7748724Fa0409e88dc14E67aA;
  address public constant ARC_POOL_ADDRESSES_PROVIDER_ADDRESS =
    0x6FdfafB66d39cD72CFE7984D3Bbcc76632faAb00;

  address public constant WETH_ADDRESS = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
  address public constant NEXT_ADMIN = 0x000000000000000000000000000000000000dEaD;
  address public constant NEXT_OWNER = 0x0000000000000000000000000000000000000001;

  event UpdateSuccess(address sender);

  function execute() external override {
    ILendingPoolConfiguratorSimple configurator = ILendingPoolConfiguratorSimple(
      ARC_POOL_CONFIGURATOR_ADDRESS
    );
    configurator.disableBorrowingOnReserve(WETH_ADDRESS);

    ILendingPoolAddressesProvider provider = ILendingPoolAddressesProvider(
      ARC_POOL_ADDRESSES_PROVIDER_ADDRESS
    );
    provider.setPoolAdmin(NEXT_ADMIN);

    Ownable providerOwnable = Ownable(ARC_POOL_ADDRESSES_PROVIDER_ADDRESS);
    providerOwnable.transferOwnership(NEXT_OWNER);

    emit UpdateSuccess(msg.sender);
  }
}
