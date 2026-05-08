import * as fs from "fs";
import * as path from "path";
import { getTokenBalance } from "../lib/rpc.js";
import { fetchPrice, USDC_MINT, JLP_MINT } from "../lib/jupiter.js";
import type { WalletState } from "../types/index.js";

const STATE_PATH = path.join(process.cwd(), "data", "wallet-state.json");
const TEMP_PATH  = STATE_PATH + ".tmp";

const DEFAULT_STATE: WalletState = {
  usdc: 0,
  ausdc: 0,
  tr: 0.5,
  redemptionHours: 0,
  lastRedemptionHour: -1,
  lastRebalancedAt: new Date(0).toISOString(),
  lastRatioAdjustedAt: new Date(0).toISOString(),
  primaryWallet: "",
  reserveWallet: "",
};

let _state: WalletState = { ...DEFAULT_STATE };

export function loadState(): WalletState {
  // clean stray temp file from a previous crashed write
  if (fs.existsSync(TEMP_PATH)) fs.unlinkSync(TEMP_PATH);

  if (!fs.existsSync(STATE_PATH)) {
    _state = { ...DEFAULT_STATE };
    saveState(_state);
    return _state;
  }

  try {
    _state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) as WalletState;
  } catch {
    _state = { ...DEFAULT_STATE };
    saveState(_state);
  }
  return _state;
}

export function saveState(s: WalletState): void {
  fs.writeFileSync(TEMP_PATH, JSON.stringify(s, null, 2), "utf8");
  fs.renameSync(TEMP_PATH, STATE_PATH);
}

export function getState(): WalletState {
  return _state;
}

export function updateState(patch: Partial<WalletState>): WalletState {
  _state = { ..._state, ...patch };
  saveState(_state);
  return _state;
}

export async function syncFromChain(primaryWallet: string): Promise<WalletState> {
  const [usdc, jlpTokens, jlpPrice] = await Promise.all([
    getTokenBalance(primaryWallet, USDC_MINT),
    getTokenBalance(primaryWallet, JLP_MINT),
    fetchPrice(JLP_MINT),
  ]);
  const ausdc = jlpTokens * jlpPrice;
  return updateState({ usdc, ausdc });
}
