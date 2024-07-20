import { PublicKey, SystemProgram } from '@solana/web3.js';
import BigNumber from 'bignumber.js';

export const TEN = new BigNumber(10);

export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
export const MINT_DECIMALS: Record<string, number> = {
    'USDC': 6,
    'SOL': 9
};

export const [APP_REFERENCE] = PublicKey.findProgramAddressSync(
    [Buffer.from("fishnet", "utf-8")],
    SystemProgram.programId
);

export const ADAMIK_CHAINS = [
    "algorand",
    "cosmoshub",
    "osmosis",
    "osmosis-testnet",
    "celestia",
    "celestia-testnet",
    "dydx",
    "cosmoshub-testnet",
    "axelar",
    "ethereum",
    "sepolia",
    "holesky",
    "zksync",
    "zksync-sepolia",
    "injective-testnet",
    "base",
    "base-sepolia",
    "optimism",
    "optimism-sepolia",
    "arbitrum",
    "arbitrum-sepolia",
    "polygon",
    "polygon-amoy",
    "bsc",
    "bsc-testnet",
    "linea",
    "linea-sepolia",
    "avalanche",
    "gnosis",
    "gnosis-chiado",
    "moonbeam",
    "moonriver",
    "moonbase",
    "fantom",
    "palm"
]