export type WalletState = {
  usdc: number;
  ausdc: number;               // JLP position value in USDC terms
  tr: number;                  // target ratio: ausdc/total, [0.10, 0.90]
  redemptionHours: number;     // hours this day where JLP was redeemed
  lastRedemptionHour: number;  // UTC hour of last redemption (dedup)
  lastRebalancedAt: string;    // ISO timestamp
  lastRatioAdjustedAt: string; // ISO timestamp
  primaryWallet: string;
  reserveWallet: string;
};

export type SwapResult = {
  signature: string;
  inputAmount: number;
  outputAmount: number;
};

export type RebalanceResult = {
  action: "buy_jlp" | "sell_jlp" | "none";
  amount: number;
  signature?: string;
};

export type SendRequest = {
  to: string;
  amount: number; // USDC
};

export type SendResult = {
  ok: boolean;
  signature?: string;
  usdcSent?: number;
  error?: string;
};

export interface WalletEntry {
  name: string;
  solAddress: string;
  [key: string]: unknown;
}
