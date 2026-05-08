import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { getState, updateState } from "../services/wallet.js";
import { swapJlpForUsdc } from "../services/swap.js";
import { zerionSendUsdc } from "../lib/zerion.js";
import { logger } from "../lib/logger.js";

const router = Router();

const SLIPPAGE_BUFFER = 1.01; // 1% buffer when redeeming JLP to cover slippage

router.post("/send", async (req: Request, res: Response): Promise<void> => {
  const { to, amount } = req.body as { to?: unknown; amount?: unknown };

  if (typeof to !== "string" || typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ ok: false, error: "body must be { to: string, amount: number (USDC) }" });
    return;
  }

  try {
    new PublicKey(to);
  } catch {
    res.status(400).json({ ok: false, error: "invalid Solana address" });
    return;
  }

  try {
    const state = getState();

    if (state.usdc < amount) {
      const shortfall = amount - state.usdc;

      if (state.ausdc < shortfall) {
        res.status(400).json({ ok: false, error: "insufficient funds (USDC + JLP)" });
        return;
      }

      logger.info("send: redeeming JLP to cover shortfall", { shortfall, amount });
      await swapJlpForUsdc(shortfall * SLIPPAGE_BUFFER);

      // track redemption hours (deduplicated per UTC hour)
      const currentHour = new Date().getUTCHours();
      const updatedState = getState();
      if (currentHour !== updatedState.lastRedemptionHour) {
        updateState({
          redemptionHours: updatedState.redemptionHours + 1,
          lastRedemptionHour: currentHour,
        });
      }
    }

    logger.info("send: sending USDC", { to, amount });
    const signature = zerionSendUsdc(amount, to);

    updateState({ usdc: Math.max(0, getState().usdc - amount) });

    logger.info("send: complete", { signature, to, amount });
    res.json({ ok: true, signature, usdcSent: amount });
  } catch (err: any) {
    logger.error("send: failed", { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
