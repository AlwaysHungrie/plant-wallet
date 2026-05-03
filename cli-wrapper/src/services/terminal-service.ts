import os from "os";
import pty from "node-pty";
import { randomUUID } from "crypto";
import { TERMINAL_MAX_IDLE, TERMINAL_MAX_WAIT, TERMINAL_MAX_LIFE } from "../constants/config.js";
import { SYSTEM_MESSAGES } from "../constants/system-messages.js";

const terminalMap = new Map<string, { proc: pty.IPty, timer: NodeJS.Timeout }>();

export const createTerminalProcess = (command: string,
  args: string[]): { terminalId: string, proc: pty.IPty } => {
  const isWin = os.platform() === "win32";
  const shell = isWin ? "powershell.exe" : "/bin/bash";
  const cmdline = [command, ...args].map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(" ");
  const shellArgs = isWin ? ["-Command", cmdline] : ["-lc", cmdline];

  const terminalId = randomUUID();

  const proc = pty.spawn(shell, shellArgs, {
    name: "xterm-color",
    cols: 120,
    rows: 30,
    cwd: process.cwd(),
    env: process.env as { [k: string]: string },
  });

  const timer = setTimeout(() => {
    console.log(SYSTEM_MESSAGES.terminalLifespanExpired.replace("{0}", terminalId));
    terminateTerminalProcess(terminalId);
  }, TERMINAL_MAX_LIFE);

  terminalMap.set(terminalId, { proc, timer });

  proc.onExit(() => {
    const entry = terminalMap.get(terminalId);
    if (entry) {
      clearTimeout(entry.timer);
      terminalMap.delete(terminalId);
    }
  });

  return { terminalId, proc };
}

/**
 * Manually terminates a terminal process by its ID.
 * @param terminalId - The ID of the terminal to terminate.
 */
export const terminateTerminalProcess = (terminalId: string): void => {
  const entry = terminalMap.get(terminalId);
  if (entry) {
    entry.proc.kill();
    clearTimeout(entry.timer);
    terminalMap.delete(terminalId);
  }
}

/**
 * Retrieves an active terminal process by its ID.
 * @param terminalId - The ID of the terminal to retrieve.
 * @returns The PTY process if found, otherwise undefined.
 */
export const getTerminalProcess = (terminalId: string): pty.IPty | undefined => {
  return terminalMap.get(terminalId)?.proc;
}

/**
 * Listens for terminal output from a PTY process.
 * Monitors the output until it stays inactive for ${TERMINAL_MAX_IDLE}ms or a total of ${TERMINAL_MAX_WAIT}ms has passed.
 * @param proc - The terminal process to listen to.
 * @returns An object containing the accumulated output and status flags.
 */
export const getTerminalOutput = async (proc: pty.IPty): Promise<{ output: string, timed_out: boolean, has_ended: boolean, is_printing: boolean }> => {
  let buffer = "";
  let last_output = Date.now();
  const start_time = Date.now();
  let has_ended = false;

  const disposableData = proc.onData((data) => {
    buffer += data;
    last_output = Date.now();
  });

  const disposableExit = proc.onExit(() => {
    has_ended = true;
  });

  while (true) {
    if (has_ended) {
      disposableData.dispose();
      disposableExit.dispose();
      return { output: buffer, timed_out: false, has_ended: true, is_printing: false };
    }

    const now = Date.now();
    const is_idle = now - last_output >= TERMINAL_MAX_IDLE;
    const is_timeout = now - start_time >= TERMINAL_MAX_WAIT;

    if (is_idle || is_timeout) {
      disposableData.dispose();
      disposableExit.dispose();
      return {
        output: buffer,
        timed_out: is_timeout,
        has_ended: false,
        is_printing: !is_idle
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}