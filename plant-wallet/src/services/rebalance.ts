import { getState, syncFromChain, updateState } from "./wallet.js";
import { swapJlpForUsdc, swapUsdcForJlp } from "./swap.js";
import { logger } from "../lib/logger.js";
import type { RebalanceResult } from "../types/index.js";

const DRIFT_THRESHOLD = 0.02;  // skip rebalance if drift < 2%
const MIN_SWAP_USDC   = 1.0;   // skip rebalance if delta < $1

export async function runRebalance(): Promise<RebalanceResult> {
  const state = getState();
  await syncFromChain(state.primaryWallet);

  const { usdc, ausdc, tr } = getState();
  const total = usdc + ausdc;

  if (total === 0) {
    return { action: "none", amount: 0 };
  }

  const currentRatio = ausdc / total;
  const drift = currentRatio - tr;

  if (Math.abs(drift) < DRIFT_THRESHOLD) {
    logger.info("rebalance: within threshold, skipping", { drift, tr });
    return { action: "none", amount: 0 };
  }

  const delta = Math.abs(drift) * total;

  if (delta < MIN_SWAP_USDC) {
    logger.info("rebalance: delta below min swap, skipping", { delta });
    return { action: "none", amount: 0 };
  }

  if (drift > 0) {
    // too much in JLP — sell JLP for USDC
    logger.info("rebalance: selling JLP for USDC", { delta });
    const result = await swapJlpForUsdc(delta);
    updateState({ lastRebalancedAt: new Date().toISOString() });
    return { action: "sell_jlp", amount: delta, signature: result.signature };
  } else {
    // too much in USDC — buy JLP
    logger.info("rebalance: buying JLP with USDC", { delta });
    const result = await swapUsdcForJlp(delta);
    updateState({ lastRebalancedAt: new Date().toISOString() });
    return { action: "buy_jlp", amount: delta, signature: result.signature };
  }
}
