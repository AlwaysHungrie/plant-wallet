import { execSync } from "child_process";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { WalletEntry } from "../types/index.js";

export function checkZerionCLI(): boolean {
  try {
    execSync("zerion --version", { stdio: "pipe" });
    return true;
  } catch (err: any) {
    const stderr = err.stderr?.toString() ?? "";
    const stdout = err.stdout?.toString() ?? "";
    if (stderr.includes("--api-key is required") || stdout.includes("--api-key is required")) {
      return true;
    }
    return false;
  }
}

export function listWallets(): { primary: WalletEntry | undefined; reserve: WalletEntry | undefined } {
  try {
    const raw = execSync("zerion wallet list --json", { stdio: "pipe" }).toString();
    const parsed = JSON.parse(raw);
    const wallets: WalletEntry[] = Array.isArray(parsed.wallets) ? parsed.wallets : [];
    return {
      primary: wallets.find((w) => w.name === "primary"),
      reserve: wallets.find((w) => w.name === "reserve"),
    };
  } catch {
    return { primary: undefined, reserve: undefined };
  }
}

export function checkZerionApiKey(): boolean {
  try {
    const raw = execSync("zerion config list --json", { stdio: "pipe" }).toString();
    const parsed = JSON.parse(raw);
    return Boolean(parsed.config?.apiKey);
  } catch {
    return false;
  }
}

export function zerionSignTx(txBase64: string, walletName: string): string {
  const tx = VersionedTransaction.deserialize(Buffer.from(txBase64, "base64"));
  const msgHex = Buffer.from(tx.message.serialize()).toString("hex");
  const raw = execSync(
    `zerion sign-message "${msgHex}" --chain solana --wallet ${walletName} --encoding hex --json`,
    { stdio: "pipe" }
  ).toString();
  const { signature, address } = JSON.parse(raw) as { signature: string; address: string };
  const sigBytes = Buffer.from(signature, "hex");
  tx.addSignature(new PublicKey(address), sigBytes);
  return Buffer.from(tx.serialize()).toString("base64");
}

export function zerionSendUsdc(amount: number, to: string, walletName = "primary"): string {
  const raw = execSync(
    `zerion send usdc ${amount} --to ${to} --chain solana --wallet ${walletName} --json`,
    { stdio: "pipe" }
  ).toString();
  const parsed = JSON.parse(raw) as { signature?: string; txid?: string };
  return parsed.signature ?? parsed.txid ?? "submitted";
}
