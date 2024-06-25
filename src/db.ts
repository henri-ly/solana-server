import { Transaction } from "./types";
import Database from "bun:sqlite";

const db = new Database("transactions.sqlite");

export function initDb() {
  db.query(`CREATE TABLE IF NOT EXISTS "transactions" (
    signature TEXT NOT NULL PRIMARY KEY,
    datasetId TEXT NOT NULL,
    datasetName TEXT NOT NULL,
    signer TEXT NOT NULL,
    seller TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    permissionHashes TEXT NOT NULL
  )`).run();
  db.query('CREATE UNIQUE INDEX IF NOT EXISTS signature ON "transactions" (signature)').run();
}

export function saveTransaction(transaction: Transaction) {
  const insert = db.prepare(`
    INSERT INTO transactions (signature, datasetId, datasetName, signer, seller, currency, amount, timestamp, permissionHashes)
    VALUES ($signature, $datasetId, $datasetName, $signer, $seller, $currency, $amount, $timestamp, $permissionHashes)
  `);
  const insertPayment = db.transaction((transaction) => {
    insert.run({
      $signature: transaction.signature,
      $datasetId: transaction.datasetId,
      $datasetName: transaction.datasetName,
      $signer: transaction.signer,
      $seller: transaction.seller,
      $currency: transaction.currency,
      $amount: transaction.amount,
      $timestamp: transaction.timestamp,
      $permissionHashes: JSON.stringify(transaction.permissionHashes),
    });
  });
  insertPayment(transaction);
}

export default db;