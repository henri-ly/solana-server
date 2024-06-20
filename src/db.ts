import Database from "bun:sqlite";

const db = new Database("transactions.sqlite");

db.query(`CREATE TABLE IF NOT EXISTS "transactions" (
    signature TEXT NOT NULL PRIMARY KEY,
    datasetId TEXT NOT NULL,
    signer TEXT NOT NULL,
    seller TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    permissionHashes TEXT NOT NULL
  )`).run();
db.query('CREATE UNIQUE INDEX IF NOT EXISTS signature ON "transactions" (signature)').run();

export default db;