import { Connection, PublicKey } from "@solana/web3.js";

let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    const url = process.env.RPC_URL ?? "https://api.mainnet-beta.solana.com";
    _connection = new Connection(url, "confirmed");
  }
  return _connection;
}

export async function getTokenBalance(walletAddress: string, mintAddress: string): Promise<number> {
  const conn = getConnection();
  const wallet = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);

  const accounts = await conn.getParsedTokenAccountsByOwner(wallet, { mint });
  if (accounts.value.length === 0) return 0;

  const info = accounts.value[0].account.data.parsed.info;
  return info.tokenAmount.uiAmount as number ?? 0;
}

export async function getSolBalance(walletAddress: string): Promise<number> {
  const conn = getConnection();
  const lamports = await conn.getBalance(new PublicKey(walletAddress));
  return lamports / 1e9;
}
