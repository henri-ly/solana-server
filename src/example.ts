import { mnemonicToPrivateKey, sign } from "@ton/crypto";
import { TonClient, WalletContractV4 } from "@ton/ton";

// Create Client
const client = new TonClient({
    endpoint: 'https://toncenter.com/api/v2/jsonRPC',
    apiKey: '262a63a0caa57206c310b1b4b5117307bf7a96c697b50fb18ca4f7d29310e81a'
});

// Generate new key
let keyPair = await mnemonicToPrivateKey("hover foster outdoor palace dress fine balance sunset trap soul away culture".split(' '));

// Create wallet contract
let workchain = 0; // Usually you need a workchain 0
let wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });

const address = wallet.address.toString();


const requestBody = {
    transaction: {
        plain: {
            chainId: 'ton',
            mode: "transfer",
            senders: [address],
            recipients: ["UQAxLON74v5km3ogohzsHKvjKWoPTxixn08iLSXMpYfF8tka"],
            amount: Math.floor((Math.random() * (100000 - 2 + 1) + 2)).toString(),
            useMaxAmount: false,
            fees: "0",
            gas: "0",
            memo: "",
            format: "hex",
            validatorAddress: "",
            params: {
                pubKey: keyPair.publicKey.toString('hex')
            }
        }
    }
};

const response = await fetch('http://localhost:3000/api/transaction/encode', {
    method: 'POST',
    headers: {
        Authorization: "afd0b43d3c2297ff5771fa6c4d6a0bf2d12405b310ff295d2ac5ad54ff509852",
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
});

const json = await response.json();
console.log(JSON.stringify(json, null, 2));

const signature = sign(Buffer.from(json.transaction.encoded, "hex"), keyPair.secretKey).toString('hex');

console.log({ signature });

const broadcastRequestBody = {
    transaction: {
        plain: json.transaction.plain,
        encoded: json.transaction.encoded,
        signature: signature
    }
};

const broadcastResponse = await fetch('http://localhost:3000/api/transaction/broadcast', {
    method: 'POST',
    headers: {
        Authorization: "afd0b43d3c2297ff5771fa6c4d6a0bf2d12405b310ff295d2ac5ad54ff509852",
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(broadcastRequestBody)
});


const tonResponse = await broadcastResponse.json();

console.log(JSON.stringify(tonResponse, null, 2));

