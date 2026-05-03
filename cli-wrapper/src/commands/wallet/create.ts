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