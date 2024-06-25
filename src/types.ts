// USDC mint is forced as payment for simplicity to not change Dataset schema
// this should be changed to accept multiple tokens as payment
export interface Dataset {
    name: string;
    owner: string;
    ownsAllTimeseries: boolean;
    available?: boolean;
    timeseriesIDs: string[];
    desc?: string;
    viewIDs?: string[];
    price?: string;
}
  
export interface DatasetMessage {
    content: Dataset;
    type: string;
    time: number;
    channel?: string;
    signature: string;
    sender: string;
    chain: string;
    item_hash: string;
    item_type: string;
    item_content?: string;
}

export interface Payment {
    signature: string;
    datasetId: string;
    datasetName: string;
    signer: string;
    seller: string;
    currency: string;
    amount: string;
    timestamp: string;
}

export type Transaction = Payment & {
    permissionHashes: string[];
}