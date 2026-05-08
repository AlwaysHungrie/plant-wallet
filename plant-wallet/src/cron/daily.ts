import cron from "node-cron";
import { runRatioAdjust } from "../services/ratioAdjust.js";
import { logger } from "../lib/logger.js";

export function startDailyCron(): void {
  cron.schedule("0 0 * * *", () => {
    logger.info("cron:daily: ratio adjust starting");
    try {
      const result = runRatioAdjust();
      logger.info("cron:daily: ratio adjust complete", { result });
    } catch (err: any) {
      logger.error("cron:daily: ratio adjust failed", { error: err.message });
    }
  });
  logger.info("cron:daily: scheduled (0 0 * * *)");
}
