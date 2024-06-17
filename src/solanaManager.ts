import { PublicKey, VersionedTransaction, SystemProgram } from "@solana/web3.js";
import { createSPLTokenInstruction } from "./solana/transferInstruction";
import { prepareTransaction } from "./solana/prepareTransaction";
import { validateTransfer } from "./solana/validateTransfer";
import { getDataset, grantPermission } from "./aleph";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BigNumber from 'bignumber.js';
import { Elysia, t } from "elysia";
import { config } from "./config";

export type CreateTransactionParams = {
  datasetId: string;
  signer: string;
}
  
export const CreateTransactionSchema = t.Object({
  datasetId: t.String(),
  signer: t.String(),
});

export type SendTransactionParams = {
  datasetId: string;
  transaction: string,
}

export const SendTransactionSchema = t.Object({
  datasetId: t.String(),
  transaction: t.String(),
});

export const solanaManager = new Elysia({ prefix: '/solana' })
  .post('/createTransaction', async ({ body }: { body: CreateTransactionParams }) => {
    try {
      const dataset = await getDataset(body.datasetId);
      if (!dataset || !dataset.price) {
        const message = 'Error fetching dataset or free dataset';
        console.error(message);
        return new Response(JSON.stringify({ error: message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const amount = new BigNumber(dataset.price, 16);
      const signer = new PublicKey(body.signer);
      const mint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC mint

      const [datasetReference] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("reference", "utf-8"),
          Buffer.from(body.datasetId, "utf-8"),
        ],
        TOKEN_PROGRAM_ID
      );
      const [appReference] = PublicKey.findProgramAddressSync(
        [Buffer.from("fishnet", "utf-8")],
        SystemProgram.programId
      );

      const senderInfo = await config.RPC.getAccountInfo(signer);
      if (!senderInfo) {
        const message = 'Sender not found';
        console.error(message);
        return new Response(JSON.stringify({ error: message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      } 
  
      const recipient = new PublicKey(dataset.owner);
      const recipientInfo = await config.RPC.getAccountInfo(recipient);  
      if (!recipientInfo) {
        const message = 'Recipient not found';
        console.error(message);
        return new Response(JSON.stringify({ error: message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      /* note: USDC mint is forced as payment for simplicity to not change Dataset schema
        this should be changed to accept multiple tokens as payment

        const transferInstruction = mint.toString() === 'So11111111111111111111111111111111111111112'
          ? await createSPLTokenInstruction(recipient, amount, splToken, sender, connection)
          : await createSystemInstruction(recipient, amount, sender, connection);
      */
      const transferInstruction = await createSPLTokenInstruction(recipient, amount, mint, signer, config.RPC);

      transferInstruction.keys.push(
        { pubkey: datasetReference, isWritable: false, isSigner: false },
        { pubkey: appReference, isWritable: false, isSigner: false }
      );

      const serializedTransaction = await prepareTransaction(transferInstruction, signer);

      return new Response(JSON.stringify({ message: serializedTransaction }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      console.error(e.message);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }, { body: CreateTransactionSchema })

  .post('/sendTransaction', async ({ body }: { body: SendTransactionParams }) => {
    const transactionBuffer = Buffer.from(body.transaction, 'base64');
    const deserializedTransaction = VersionedTransaction.deserialize(transactionBuffer);

    try {
      const signature = await config.RPC.sendRawTransaction(deserializedTransaction.serialize(), {
        skipPreflight: true,
        maxRetries: 0,
      });

      let confirmedTx = null;

      console.log(`${new Date().toISOString()} Subscribing to transaction confirmation`);

      const confirmTransactionPromise = config.RPC.confirmTransaction(
        {
          signature,
          blockhash: deserializedTransaction.message.recentBlockhash,
          lastValidBlockHeight: (await config.RPC.getLatestBlockhash()).lastValidBlockHeight,
        },
        'confirmed'
      );

      console.log(`${new Date().toISOString()} Sending Transaction ${signature}`);
      
      while (!confirmedTx) {
        confirmedTx = await Promise.race([
          confirmTransactionPromise,
          new Promise((resolve) =>
            setTimeout(() => {
              resolve(null);
            }, 2000)
          ),
        ]);

        if (!confirmedTx) {
          await config.RPC.sendRawTransaction(deserializedTransaction.serialize(), {
            skipPreflight: true,
            maxRetries: 0,
          });
        }
      }

      if (!confirmedTx) {
        throw new Error("Transaction confirmation failed");
      }

      console.log(`${new Date().toISOString()} Transaction successful`);
      console.log(`${new Date().toISOString()} Explorer URL: https://explorer.solana.com/tx/${signature}`);

      const payment = await validateTransfer(signature, body.datasetId);
      await grantPermission(payment);

      return new Response(JSON.stringify({ message: 'success', signature }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error: any) {
      console.error('Error sending transaction:', error);
      return new Response(JSON.stringify({ message: 'error', error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }, { body: SendTransactionSchema });
