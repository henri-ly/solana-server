import { Wallet } from "ethers";

const walletPhrase = "...";
const ADAMIK_API_KEY = "afd0b43d3c2297ff5771fa6c4d6a0bf2d12405b310ff295d2ac5ad54ff509852";
const recipientAddress = "";

async function main() {
  const wallet = Wallet.fromPhrase(
    walletPhrase
  );
    const requestBody = {
      transaction: {
        plain: {
          chainId: "sepolia",
          mode: "transfer",
          senders: [wallet.address],
          recipients: [recipientAddress || wallet.address], // we self send if no recipient
          amount: "10000",
          useMaxAmount: false,
          fees: "0",
          gas: "0",
          memo: "",
          format: "hex",
          validatorAddress: "",
          params: {
            pubKey: wallet.publicKey
          }
        }
      }
    };

    const responseEncode = await fetch('https://api.adamik.io/api/transaction/encode', {
      method: 'POST',
      headers: {
        Authorization: ADAMIK_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

  const encodeData = await responseEncode.json();

  console.log(encodeData);
  
  const tx = encodeData.transaction.encoded;

  const signature = await wallet.signTransaction(tx);
  const sendTransactionBody = {
    transaction: {
      plain: encodeData.transaction.plain,
      encoded: tx,
      signature: signature,
    },
  };

  const responseBroadcast = await fetch('https://api.adamik.io/api/transaction/broadcast', {
    method: 'POST',
    headers: {
      Authorization: ADAMIK_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(sendTransactionBody)
  });

  const responseData = await responseBroadcast.json();

  console.log("Transaction Result:", JSON.stringify(responseData));
}

main();
