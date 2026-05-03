import { createTerminalProcess, getTerminalOutput, terminateTerminalProcess, getTerminalProcess } from "../../services/terminal-service.js";

export const createWalletStart = async () => {
  const { terminalId, proc } = createTerminalProcess("zerion", ["wallet", "create"]);
  const { output, timed_out, has_ended, is_printing } = await getTerminalOutput(proc);

  if (is_printing) {
    throw new Error("Terminal is still printing");
  }

  if (!timed_out && !has_ended) {
    return {
      output,
      terminalId
    }
  }
}

export const enterPassphrase = async (terminalId: string, passphrase: string) => {
  const proc = getTerminalProcess(terminalId);
  if (!proc) {
    throw new Error("Terminal not found");
  }
  proc.write(passphrase + "\n");
  const { output, timed_out, has_ended, is_printing } = await getTerminalOutput(proc);
  return { output, timed_out, has_ended, is_printing }
}