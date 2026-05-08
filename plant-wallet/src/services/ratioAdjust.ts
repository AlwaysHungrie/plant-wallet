import { getState, updateState } from "./wallet.js";
import { logger } from "../lib/logger.js";

const TR_MIN  = 0.10;
const TR_MAX  = 0.90;
const TR_STEP = 0.05;
// redeem in >20% of hours → need more liquid USDC → lower JLP ratio
const HIGH_REDEMPTION_RATE = 0.20;
// redeem in <5% of hours → too much idle USDC → raise JLP ratio
const LOW_REDEMPTION_RATE  = 0.05;
const HOURS_IN_DAY = 24;

export function runRatioAdjust(): { oldTr: number; newTr: number; redemptionHours: number } {
  const state = getState();
  const { tr, redemptionHours } = state;
  const redemptionRate = redemptionHours / HOURS_IN_DAY;

  let newTr = tr;
  if (redemptionRate > HIGH_REDEMPTION_RATE) {
    newTr = Math.min(TR_MAX, tr + TR_STEP);
    logger.info("ratio adjust: high redemption, raising TR", { redemptionRate, oldTr: tr, newTr });
  } else if (redemptionRate < LOW_REDEMPTION_RATE) {
    newTr = Math.max(TR_MIN, tr - TR_STEP);
    logger.info("ratio adjust: low redemption, lowering TR", { redemptionRate, oldTr: tr, newTr });
  } else {
    logger.info("ratio adjust: stable, no change", { redemptionRate, tr });
  }

  updateState({ tr: newTr, redemptionHours: 0, lastRatioAdjustedAt: new Date().toISOString() });
  return { oldTr: tr, newTr, redemptionHours };
}
