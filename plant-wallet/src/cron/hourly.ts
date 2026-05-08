import cron from "node-cron";
import { runRebalance } from "../services/rebalance.js";
import { logger } from "../lib/logger.js";

export function startHourlyCron(): void {
  cron.schedule("0 * * * *", async () => {
    logger.info("cron:hourly: rebalance starting");
    try {
      const result = await runRebalance();
      logger.info("cron:hourly: rebalance complete", { result });
    } catch (err: any) {
      logger.error("cron:hourly: rebalance failed", { error: err.message });
    }
  });
  logger.info("cron:hourly: scheduled (0 * * * *)");
}
