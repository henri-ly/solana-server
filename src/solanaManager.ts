import { PublicKey, VersionedTransaction, SystemProgram } from "@solana/web3.js";
import { createSPLTokenInstruction } from "./solana/transferInstruction";
import { prepareTransaction } from "./solana/prepareTransaction";
import { validateTransfer } from "./solana/validateTransfer";
import { getDataset } from "./aleph";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BigNumber from 'bignumber.js';
import { Elysia, t } from "elysia";
import { config } from "./config";
import db from "./db";

export type CreateTransactionParams = {
  datasetId: string;
  signer: string;
}

export type SendTransactionParams = {
  datasetId: string;
  transaction: string,
}

export const SendTransactionSchema = t.Object({
  datasetId: t.String(),
  transaction: t.String(),
});

export type GetTransactionsParams = {
  address: string;
}

export const solanaManager = new Elysia({ prefix: '/solana' })
  // note: would be interesting to save built transactions to validate them on the sendTransaction 
  // if the transaction was built by this handler
  .get('/createTransaction', async ({ query }: { query: CreateTransactionParams }) => {
    try {
      const dataset = await getDataset(query.datasetId);
      if (!dataset || !dataset.price) {
        const message = 'Error fetching dataset or free dataset';
        console.error(message);
        return new Response(JSON.stringify({ error: message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const amount = new BigNumber(dataset.price);
      const signer = new PublicKey(query.signer);
      const mint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC mint

      const [datasetReference] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("reference", "utf-8"),
          Buffer.from(query.datasetId, "hex"),
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

      return new Response(JSON.stringify({ transaction: serializedTransaction }), {
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
  })

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

      console.log(`${new Date().toISOString()} Transaction successful: https://explorer.solana.com/tx/${signature}`);

      // note: in this validation the permission messages are posted
      const transaction = await validateTransfer(signature, body.datasetId);

      const insert = db.prepare(`
        INSERT INTO transactions (signature, permissionHash, datasetId, signer, seller, currency, amount, timestamp)
        VALUES ($signature, $permissionHash, $datasetId, $signer, $seller, $currency, $amount, $timestamp)
      `);
      const insertPayment = db.transaction((transaction) => {
        insert.run({
          $signature: transaction.signature,
          $permissionHash: transaction.permissionHash,
          $datasetId: transaction.datasetId,
          $signer: transaction.signer,
          $seller: transaction.seller,
          $currency: transaction.currency,
          $amount: parseFloat(transaction.amount),
          $timestamp: transaction.timestamp,
        });
      });
      insertPayment(transaction);

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
  }, { body: SendTransactionSchema })
  
  .get('/getTransactions', async ({ query: { address } }: { query: GetTransactionsParams }) => {
    console.log(address)
    if (!address) {
      return new Response(JSON.stringify({ error: 'User address is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const query = db.query("SELECT * FROM transactions WHERE signer = $signer");
      const transactions = query.all({ $signer: address });
  
      return new Response(JSON.stringify(transactions), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error: any) {
      console.error('Error sending transaction:', error);
      return new Response(JSON.stringify({ message: 'error', error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  })
