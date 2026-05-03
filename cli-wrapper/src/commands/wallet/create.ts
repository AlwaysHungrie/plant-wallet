import { parseRawOutput } from "../../services/output-parsing.js";
import { createTerminalProcess, getTerminalOutput, getTerminalProcess, enterPrompt, enterOption, enterMultipleOptions } from "../../services/terminal-service.js";

export const createWalletStart = async () => {
  const { terminalId, proc } = createTerminalProcess("zerion", ["wallet", "create"]);
  const terminalOutput = await getTerminalOutput(proc);

  const response = parseRawOutput(terminalOutput, terminalId);

  console.log(response);

  if (response.userAction && response.userAction.prompt === "Enter passphrase:") {
    return response;
  }

  throw new Error("Error creating wallet");
}

export const enterPassphrase = async (terminalId: string, passphrase: string) => {
  const proc = getTerminalProcess(terminalId);
  if (!proc) {
    throw new Error("Terminal not found");
  }

  await enterPrompt(proc, passphrase);
  const terminalOutput = await getTerminalOutput(proc);
  const response = parseRawOutput(terminalOutput, terminalId);

  if (response.userAction?.prompt !== "Confirm passphrase:") {
    throw new Error("Error creating wallet");
  }

  await enterPrompt(proc, passphrase);
  const terminalOutput2 = await getTerminalOutput(proc);
  const response2 = parseRawOutput(terminalOutput2, terminalId);

  if (response2.userAction?.prompt !== "Have you backed up the passphrase? Type YES to confirm:") {
    throw new Error("Error creating wallet");
  }

  await enterPrompt(proc, "YES");
  const terminalOutput3 = await getTerminalOutput(proc);
  return parseRawOutput(terminalOutput3, terminalId);
};

export const selectPolicy = async (terminalId: string, option: number) => {
  const proc = getTerminalProcess(terminalId);
  if (!proc) {
    throw new Error("Terminal not found");
  }

  await enterOption(proc, option);
  const terminalOutput = await getTerminalOutput(proc);
  return parseRawOutput(terminalOutput, terminalId);
};

export const selectMultiplePolicies = async (terminalId: string, choices: boolean[]) => {
  const proc = getTerminalProcess(terminalId);
  if (!proc) {
    throw new Error("Terminal not found");
  }

  await enterMultipleOptions(proc, choices);
  const terminalOutput = await getTerminalOutput(proc);
  return parseRawOutput(terminalOutput, terminalId);
};