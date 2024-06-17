import { TransactionInstruction, PublicKey, ComputeBudgetProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { config } from "../config";

export async function prepareTransaction(transferInstruction: TransactionInstruction, payerKey: PublicKey) {
  const instructions = [transferInstruction];

  const microLamports = await getPriorityFee() || 5000;
  const computePriceInstruction = ComputeBudgetProgram.setComputeUnitPrice({ microLamports });
  instructions.unshift(computePriceInstruction);

  const units = await getComputeUnits([...instructions], payerKey);
  const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({ units });
  instructions.unshift(computeBudgetInstruction);

  const recentBlockhash = (await config.RPC.getLatestBlockhash('finalized')).blockhash;
  const messageV0 = new TransactionMessage({
    payerKey,
    recentBlockhash,
    instructions,
  }).compileToV0Message();
  const transaction = new VersionedTransaction(messageV0);
  
  return Buffer.from(transaction.serialize()).toString('base64');
}

async function getComputeUnits(originalInstructions: TransactionInstruction[], payerKey: PublicKey): Promise<number> {
  // dont modify original instructions array
  const instructions = [...originalInstructions];

  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1400000,
  });
  instructions.unshift(computeBudgetIx);

  const message = new TransactionMessage({
    payerKey,
    recentBlockhash: PublicKey.default.toString(),
    instructions,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);
  const rpcResponse = await config.RPC.simulateTransaction(transaction, {
    replaceRecentBlockhash: true,
    sigVerify: false,
  });

  return rpcResponse.value.unitsConsumed || 1400000;
}

export async function getPriorityFee(): Promise<number | null> {
  const blockHeight = (await config.RPC.getBlockHeight());
  const blockData = await config.RPC.getBlock(blockHeight, { maxSupportedTransactionVersion: 0 });

  if (!blockData || !blockData.transactions) {
    return null;
  }

  const transactionsInfo = blockData.transactions
    .filter(tx => tx.meta && tx.meta.fee > 5000 && tx.meta.computeUnitsConsumed !== undefined && tx.meta.computeUnitsConsumed > 0)
    .map(tx => ({
      fee: tx.meta!.fee,
      computeUnitsConsumed: tx.meta!.computeUnitsConsumed!
    }));

  const priorityFees = transactionsInfo.map(txInfo => (txInfo.fee - 5000) / txInfo.computeUnitsConsumed);
  priorityFees.sort((a, b) => a - b);

  let medianPriorityFee = 0;
  if (priorityFees.length > 0) {
    const n = priorityFees.length;
    if (n % 2 === 0) {
      medianPriorityFee = (priorityFees[Math.floor(n / 2) - 1] + priorityFees[Math.floor(n / 2)]) / 2;
    } else {
      medianPriorityFee = priorityFees[Math.floor(n / 2)];
    }
  }

  return Math.round(medianPriorityFee * 10 ** 6);
}
