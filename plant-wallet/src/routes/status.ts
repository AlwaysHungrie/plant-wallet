import { Router, Request, Response } from "express";
import { getState } from "../services/wallet.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const state = getState();
  const total = state.usdc + state.ausdc;
  res.json({
    message: "plant-brain online",
    primaryWallet: state.primaryWallet,
    reserveWallet: state.reserveWallet,
    balance: {
      usdc: state.usdc,
      jlp_usdc_value: state.ausdc,
      total,
    },
    strategy: {
      targetRatio: state.tr,
      currentRatio: total > 0 ? +(state.ausdc / total).toFixed(4) : 0,
      redemptionHoursToday: state.redemptionHours,
    },
    timestamps: {
      lastRebalancedAt: state.lastRebalancedAt,
      lastRatioAdjustedAt: state.lastRatioAdjustedAt,
    },
  });
});

export default router;
