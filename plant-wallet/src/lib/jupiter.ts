import type { SwapResult } from "../types/index.js";

export const JUP_BASE = "https://api.jup.ag";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const JLP_MINT = "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4";
export const SOL_MINT = "So11111111111111111111111111111111111111112";

function apiKey(): string {
  return process.env.JUP_API_KEY ?? "";
}

type OrderResponse = {
  transaction: string;
  requestId: string;
  outAmount?: string;
  errorCode?: string;
  errorMessage?: string;
};

type ExecuteResponse = {
  signature?: string;
  txid?: string;
  error?: string;
  code?: number;
};

type PriceResponse = Record<string, { price: number } | null>;

export async function jupiterSwapOrder(params: {
  inputMint: string;
  outputMint: string;
  amountRaw: number; // already in base units (smallest denomination)
  taker: string;
}): Promise<OrderResponse> {
  const url =
    `${JUP_BASE}/swap/v2/order` +
    `?inputMint=${params.inputMint}` +
    `&outputMint=${params.outputMint}` +
    `&amount=${params.amountRaw}` +
    `&taker=${params.taker}`;

  const res = await fetch(url, { headers: { "x-api-key": apiKey() } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jupiter order failed ${res.status}: ${body}`);
  }
  const order = await res.json() as OrderResponse;
  if (!order.transaction) {
    throw new Error(`Jupiter order: no transaction. code=${order.errorCode} msg=${order.errorMessage}`);
  }
  return order;
}

export async function jupiterSwapExecute(params: {
  signedTransaction: string;
  requestId: string;
}): Promise<SwapResult> {
  const res = await fetch(`${JUP_BASE}/swap/v2/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey() },
    body: JSON.stringify({ signedTransaction: params.signedTransaction, requestId: params.requestId }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jupiter execute failed ${res.status}: ${body}`);
  }
  const result = await res.json() as ExecuteResponse;
  if (result.code !== undefined && result.code !== 0) {
    throw new Error(`Jupiter swap error code ${result.code}: ${result.error ?? "unknown"}`);
  }
  return {
    signature: result.signature ?? result.txid ?? "submitted",
    inputAmount: 0,   // filled by callers who know the input
    outputAmount: 0,  // filled by callers; Jupiter v2 execute doesn't return outAmount
  };
}

export async function fetchPrice(mint: string): Promise<number> {
  const res = await fetch(`${JUP_BASE}/price/v3?ids=${mint}`, {
    headers: { "x-api-key": apiKey() },
  });
  if (!res.ok) {
    throw new Error(`Jupiter price fetch failed ${res.status}`);
  }
  const body = await res.json() as PriceResponse;
  console.log("Price Response:", body);
  const entry = body[mint];
  if (!entry) throw new Error(`No price data for mint ${mint}`);
  return entry.price;
}
