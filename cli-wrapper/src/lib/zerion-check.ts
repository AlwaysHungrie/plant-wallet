// Check if the zerion cli is installed

import { spawnSync } from "child_process";
import { SYSTEM_MESSAGES } from "../constants/system-messages.js";

export const isZerionInstalled = () => {
  const result = spawnSync("zerion", ["--version"]);
  if (result.status !== 0 || !result.stdout) {
    console.log(SYSTEM_MESSAGES.zerionNotFound);
    process.exit(1);
  }
  return true;
};
