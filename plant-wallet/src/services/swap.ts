import { jupiterSwapOrder, jupiterSwapExecute, USDC_MINT, JLP_MINT } from "../lib/jupiter.js";
import { zerionSignTx } from "../lib/zerion.js";
import { getState, updateState } from "./wallet.js";
import type { SwapResult } from "../types/index.js";

const DECIMALS = 1_000_000; // both USDC and JLP are 6 decimals

async function executeSwap(
  inputMint: string,
  outputMint: string,
  amount: number,
): Promise<SwapResult> {
  const state = getState();
  const amountRaw = Math.round(amount * DECIMALS);

  const order = await jupiterSwapOrder({ inputMint, outputMint, amountRaw, taker: state.primaryWallet });
  const signedTx = zerionSignTx(order.transaction, "primary");
  const result = await jupiterSwapExecute({ signedTransaction: signedTx, requestId: order.requestId });

  return { ...result, inputAmount: amount };
}

export async function swapUsdcForJlp(amountUsdc: number): Promise<SwapResult> {
  const result = await executeSwap(USDC_MINT, JLP_MINT, amountUsdc);
  const state = getState();
  // optimistic: treat received JLP as 1:1 USDC equivalent (reconciled on next sync)
  updateState({
    usdc: Math.max(0, state.usdc - amountUsdc),
    ausdc: state.ausdc + amountUsdc,
  });
  return result;
}

export async function swapJlpForUsdc(amountUsdc: number): Promise<SwapResult> {
  const result = await executeSwap(JLP_MINT, USDC_MINT, amountUsdc);
  const state = getState();
  updateState({
    ausdc: Math.max(0, state.ausdc - amountUsdc),
    usdc: state.usdc + amountUsdc,
  });
  return result;
}
