import axios from "axios";
import BigNumber from "bignumber.js";
import { ethers, Wallet } from "ethers";

async function main() {
  const wallet = Wallet.fromPhrase(
    "hover foster outdoor palace dress fine balance sunset trap soul away culture"
  );
  const blockchain = "sepolia";
  const datasetId =
    "a8342dbc0c29843190dc4db03c795443d8aeefb5424e103792453d3ce7b546b3";

  const config = {
    blockchain,
    datasetId,
    signer: wallet.address,
    publicKey: wallet.publicKey,
  };

  console.log(await wallet.getAddress())

  const response = await axios.get(
    "http://127.0.0.1:3000/evm/createTransaction",
    {
      params: config,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  const transactionData = JSON.parse(response.data.transaction);
  const tx = transactionData.encoded;

  const signature = await wallet.signTransaction(tx);
  const sendTransactionParams = {
    blockchain,
    datasetId,
    transaction: JSON.stringify(transactionData.plain),
    encodedTransaction: transactionData.encoded,
    signature,
  };
  const sendResponse = await axios.post(
    "http://127.0.0.1:3000/evm/sendTransaction",
    sendTransactionParams,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  console.log("Transaction Result:", sendResponse.data);
}

main();
