
import { AccountLayout, TOKEN_PROGRAM_ID, transferCheckedInstructionData } from '@solana/spl-token';
import { PublicKey, SystemProgram, VersionedTransaction } from '@solana/web3.js';
import { getDataset } from '../aleph';
import { config } from '../config';
import { Payment } from '../types';

export async function validateTransfer(signature: string, datasetId: string): Promise<Payment> {
    const response = await config.RPC.getTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
    if (!response) throw new Error('transaction not found');

    const { message } = response.transaction;
    const transaction = new VersionedTransaction(message);
    const instructions = transaction.message.compiledInstructions;
    const transferInstruction = instructions.pop();
    if (!transferInstruction) throw new Error('missing transfer instruction');

    const { amount } = transferCheckedInstructionData.decode(transferInstruction.data);
    const [source, mint, destination, owner, txDatasetReference, txAppReference] = transferInstruction.accountKeyIndexes.map(index => ({
        pubkey: transaction.message.staticAccountKeys[index],
        isSigner: transaction.message.isAccountSigner(index),
        isWritable: transaction.message.isAccountWritable(index),
    }));

    const dataset = await getDataset(datasetId);
    const [datasetReference] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("reference", "utf-8"),
          Buffer.from(datasetId, "hex"),
        ],
        TOKEN_PROGRAM_ID
    );
    const [appReference] = PublicKey.findProgramAddressSync(
        [Buffer.from("fishnet", "utf-8")],
        SystemProgram.programId
    );

    const sellerATA = await config.RPC.getAccountInfo(source.pubkey, 'confirmed');
    const signerATA = await config.RPC.getAccountInfo(destination.pubkey, 'confirmed');
    if (!sellerATA || !signerATA) throw new Error('error fetching ata info');

    const decodedSellerATA = AccountLayout.decode(sellerATA.data);
    const decodedSignerATA = AccountLayout.decode(signerATA.data);
    const seller = decodedSellerATA.owner.toString();
    const signer = decodedSignerATA.owner.toString();

    if (amount.toString(16) === dataset.price) throw new Error('amount not transferred');
    if (datasetReference.toString() === txDatasetReference.toString()) throw new Error('wrong dataset reference');
    if (appReference.toString() === txAppReference.toString()) throw new Error('wrong app reference');
    if (seller.toString() === dataset.owner) throw new Error('wrong seller');

    return {
        signature,
        datasetId,
        signer,
        seller,
        currency: mint.pubkey.toBase58(),
        amount: amount.toString(16),
        timestamp: new Date().toISOString(),
    };
}
