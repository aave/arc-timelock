import { Signer, BigNumber, Bytes } from 'ethers';
import { expect } from 'chai';
import { tEthereumAddress } from '../../helpers/types';
import { IAaveGovernanceV2 } from '../../typechain';

export const expectProposalState = async (
  IAaveGovernanceV2: IAaveGovernanceV2,
  proposalId: number,
  state: number
): Promise<void> => {
  expect(await IAaveGovernanceV2.getProposalState(proposalId)).to.be.equal(state);
};

export const createProposal = async (
  IAaveGovernanceV2: IAaveGovernanceV2,
  signer: Signer,
  executor: string,
  targets: tEthereumAddress[],
  values: BigNumber[],
  signatures: string[],
  calldatas: string[] | Bytes[],
  withDelegatecalls: boolean[],
  ipfsHash: string
) => {
  const proposalTx = await IAaveGovernanceV2.connect(signer).create(
    executor,
    targets,
    values,
    signatures,
    calldatas,
    withDelegatecalls,
    ipfsHash
  );
  await expect(proposalTx).to.emit(IAaveGovernanceV2, 'ProposalCreated');
  const proposalTxReceipt = await proposalTx.wait();
  const proposalLog = IAaveGovernanceV2.interface.parseLog(proposalTxReceipt.logs[0]);
  return IAaveGovernanceV2.interface.decodeEventLog(
    proposalLog.eventFragment,
    proposalTxReceipt.logs[0].data
  );
};

export const triggerWhaleVotes = async (
  IAaveGovernanceV2: IAaveGovernanceV2,
  whales: Signer[],
  proposalId: BigNumber,
  yesOrNo: boolean
): Promise<void> => {
  const vote = async (signer: Signer) => {
    const tx = await IAaveGovernanceV2.connect(signer).submitVote(proposalId, yesOrNo);
    await tx.wait();
  };
  const promises = whales.map(vote);
  await Promise.all(promises);
};

export const queueProposal = async (
  IAaveGovernanceV2: IAaveGovernanceV2,
  proposalId: BigNumber
) => {
  const queueTx = await IAaveGovernanceV2.queue(proposalId);
  await expect(queueTx).to.emit(IAaveGovernanceV2, 'ProposalQueued');
  const queueTxReceipt = await queueTx.wait();
  const queueLog = IAaveGovernanceV2.interface.parseLog(queueTxReceipt.logs[1]);
  return IAaveGovernanceV2.interface.decodeEventLog(
    queueLog.eventFragment,
    queueTxReceipt.logs[1].data
  );
};
