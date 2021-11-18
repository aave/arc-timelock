import { BigNumber } from 'ethers';
import { utils } from 'ethers';

// ----------------
// MATH
// ----------------

export const PERCENTAGE_FACTOR = '10000';
export const HALF_PERCENTAGE = BigNumber.from(PERCENTAGE_FACTOR).div(2).toString();
export const WAD = BigNumber.from(10).pow(18).toString();
export const HALF_WAD = BigNumber.from(WAD).div(2).toString();
export const RAY = BigNumber.from(10).pow(27).toString();
export const HALF_RAY = BigNumber.from(RAY).div(2).toString();
export const WAD_RAY_RATIO = utils.parseUnits('1', 9).toString();
export const oneEther = utils.parseUnits('1', 18);
export const oneRay = utils.parseUnits('1', 27);
export const MAX_UINT_AMOUNT =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';
export const ONE_YEAR = '31536000';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ONE_ADDRESS = '0x0000000000000000000000000000000000000001';
// ----------------
// PROTOCOL GLOBAL PARAMS
// ----------------
export const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
export const AAVE_ADDRESS = '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9';
export const AAVE_REFERRAL = '0';

export const GOVERNANCE_PROPOSAL_STATE = {
  PENDING: 0,
  CANCELED: 1,
  ACTIVE: 2,
  FAILED: 3,
  SUCCEEDED: 4,
  QUEUED: 5,
  EXPIRED: 6,
  EXECUTED: 7,
};

export const PERMISSIONED_MANAGER_PERMISSION = {
  DEPOSITOR: 0,
  BORROWER: 1,
  LIQUIDATOR: 2,
};
