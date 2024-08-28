import { Connection, Keypair } from "@solana/web3.js";
import { SOLAccount } from "aleph-sdk-ts/dist/accounts/solana";

let keypair = Keypair.generate();
console.log(keypair);

const secretArray = JSON.parse(Bun.env.MESSAGES_SIGNER!);
const secretUint8Array = new Uint8Array(secretArray || []);
const messagesSigner = Keypair.fromSecretKey(secretUint8Array);

export const config = {
  HOST: Bun.env.HOST || "127.0.0.1",
  PORT: Bun.env.PORT || "3000",
  RPC: new Connection(Bun.env.RPC_KEY || ""),
  ALEPH_SERVER: Bun.env.ALEPH_SERVER || "https://api2.aleph.im",
  SOL_ACCOUNT: new SOLAccount(messagesSigner.publicKey, messagesSigner),
  FISHNET_CHANNEL: Bun.env.FISHNET_CHANNEL || "FISHNET_TEST_V1.1",
  ADAMIK_KEY: Bun.env.ADAMIK_KEY || "",
};

const requiredEnvVariables = ["RPC_KEY", "MESSAGES_SIGNER", "ADAMIK_KEY"];

requiredEnvVariables.forEach((variable) => {
  if (config[variable as keyof typeof config] === "") {
    throw new Error(`Missing required environment variable: ${variable}`);
  }
});
