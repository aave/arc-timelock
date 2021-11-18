//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.7.5;

import {ITimelockExecutor} from '../interfaces/ITimelockExecutor.sol';

interface IProposalExecutor {
  function execute() external;
}

interface IArcTimelock {
  function updateEthereumGovernanceExecutor(address newGovernanceExecutor) external;
}

contract ArcTimelockUpdate is IProposalExecutor {

  address public immutable ARC_TIMELOCK_ADDRESS;

  address public constant NEW_GUARDIAN_ADDRESS = 0x0000000000000000000000000000000000000001;
  uint256 public constant NEW_DELAY = 172802;
  uint256 public constant NEW_GRACE_PERIOD = 432001;
  uint256 public constant NEW_MINIMUM_DELAY = 172801;
  uint256 public constant NEW_MAXIMUM_DELAY = 172803;
  address public constant NEW_GOVERNANCE_EXECUTOR_ADDRESS = 0x0000000000000000000000000000000000000002;

  event UpdateSuccess(address sender);

  constructor(address arcTimelockAddress) {
    ARC_TIMELOCK_ADDRESS = arcTimelockAddress;
  }

  function execute() override external {
    ITimelockExecutor timelock = ITimelockExecutor(ARC_TIMELOCK_ADDRESS);
    timelock.updateGuardian(NEW_GUARDIAN_ADDRESS);
    timelock.updateGracePeriod(NEW_GRACE_PERIOD);
    timelock.updateMaximumDelay(NEW_MAXIMUM_DELAY);
    timelock.updateDelay(NEW_DELAY);
    timelock.updateMinimumDelay(NEW_MINIMUM_DELAY);


    IArcTimelock executorTimelock = IArcTimelock(ARC_TIMELOCK_ADDRESS);
    executorTimelock.updateEthereumGovernanceExecutor(NEW_GOVERNANCE_EXECUTOR_ADDRESS);

    emit UpdateSuccess(msg.sender);
  }
}
