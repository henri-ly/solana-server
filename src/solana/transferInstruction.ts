import { AccountInfo, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { createTransferCheckedInstruction, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { MINT_DECIMALS, TEN, USDC_MINT } from '../constants';
import BigNumber from 'bignumber.js';
import { config } from '../config';

// Private solana-pay utils to get transfer instructions

export async function createSystemInstruction(
  recipient: PublicKey,
  amount: BigNumber,
  sender: PublicKey,
  senderInfo: AccountInfo<Buffer>,
): Promise<TransactionInstruction> {
  if (!senderInfo.owner.equals(SystemProgram.programId)) throw new Error('sender owner invalid');
  if (senderInfo.executable) throw new Error('sender executable');

  // Check that the amount provided doesn't have greater precision than SOL
  if ((amount.decimalPlaces() ?? 0) > MINT_DECIMALS['SOL']) throw new Error('amount decimals invalid');

  // Convert input decimal amount to integer lamports
  amount = amount.times(LAMPORTS_PER_SOL).integerValue(BigNumber.ROUND_FLOOR);

  // Check that the sender has enough lamports
  const lamports = amount.toNumber();
  if (lamports > senderInfo.lamports) throw new Error('insufficient funds');

  // Create an instruction to transfer native SOL
  return SystemProgram.transfer({
    fromPubkey: sender,
    toPubkey: recipient,
    lamports,
  });
}

export async function createSPLTokenInstruction(
  recipient: PublicKey,
  amount: BigNumber,
  sender: PublicKey,
): Promise<TransactionInstruction> {
  const USDC_DECIMALS = MINT_DECIMALS['USDC'];
  // Convert input decimal amount to integer tokens according to the mint decimals
  amount = amount.times(TEN.pow(MINT_DECIMALS['USDC'])).integerValue(BigNumber.ROUND_FLOOR);

  // Get the sender's ATA and check that the account exists and can send tokens
  const senderATA = await getAssociatedTokenAddress(USDC_MINT, sender);
  const senderAccount = await getAccount(config.RPC, senderATA);
  if (!senderAccount.isInitialized) throw new Error('sender not initialized');
  if (senderAccount.isFrozen) throw new Error('sender frozen');

  // Get the recipient's ATA and check that the account exists and can receive tokens
  const recipientATA = await getAssociatedTokenAddress(USDC_MINT, recipient);
  const recipientAccount = await getAccount(config.RPC, recipientATA);
  if (!recipientAccount.isInitialized) throw new Error('recipient not initialized');
  if (recipientAccount.isFrozen) throw new Error('recipient frozen');

  // Check that the sender has enough tokens
  const tokens = BigInt(String(amount));
  if (tokens > senderAccount.amount) throw new Error('insufficient funds');

  // Create an instruction to transfer SPL tokens, asserting the mint and decimals match
  return createTransferCheckedInstruction(senderATA, USDC_MINT, recipientATA, sender, tokens, USDC_DECIMALS);
}