import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { checkZerionCLI, checkZerionApiKey, listWallets } from "./lib/zerion.js";
import { loadState, updateState, syncFromChain } from "./services/wallet.js";
import { startHourlyCron } from "./cron/hourly.js";
import { startDailyCron } from "./cron/daily.js";
import sendRouter from "./routes/send.js";
import statusRouter from "./routes/status.js";
import { logger } from "./lib/logger.js";

const PORT = process.env.PORT ?? 4000;

async function bootstrap(): Promise<void> {
  if (!checkZerionCLI()) {
    console.error("ERROR: Zerion CLI not found. Install: npm install -g zerion-cli");
    process.exit(1);
  }

  if (!process.env.JUP_API_KEY) {
    console.error("ERROR: JUP_API_KEY env var not set.");
    process.exit(1);
  }

  const { primary, reserve } = listWallets();

  if (!primary) {
    console.error(
      [
        "ERROR: No wallet named 'primary' found.",
        "  zerion agent create-policy --name agent-policy --chains solana --expires 365000d",
        "  zerion wallet create --name primary",
      ].join("\n")
    );
    process.exit(1);
  }

  if (!reserve) {
    console.error("ERROR: No wallet named 'reserve' found.\n  zerion wallet create --name reserve");
    process.exit(1);
  }

  if (!checkZerionApiKey()) {
    console.error("ERROR: ZERION_API_KEY not set.\n  zerion config set apiKey zk_...");
    process.exit(1);
  }

  loadState();
  updateState({ primaryWallet: primary.solAddress, reserveWallet: reserve.solAddress });

  logger.info("bootstrap: syncing balances from chain");
  await syncFromChain(primary.solAddress);

  logger.info("bootstrap: complete", {
    primary: primary.solAddress,
    reserve: reserve.solAddress,
  });
}

async function main(): Promise<void> {
  await bootstrap();

  const app = express();
  app.use(express.json());

  app.use("/", statusRouter);
  app.use("/", sendRouter);

  startHourlyCron();
  startDailyCron();

  app.listen(PORT, () => {
    logger.info(`plant-brain listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
