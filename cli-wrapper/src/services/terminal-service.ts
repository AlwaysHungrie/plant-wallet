import os from "os";
import pty from "node-pty";
import { randomUUID } from "crypto";
import { TERMINAL_MAX_IDLE, TERMINAL_MAX_WAIT, TERMINAL_MAX_LIFE } from "../constants/config.js";
import { SYSTEM_MESSAGES } from "../constants/system-messages.js";
import type { RawTerminalOutputType } from "../types/terminal-types.js";
import { sanitizeStringInput } from "./output-parsing.js";

const terminalMap = new Map<string, { proc: pty.IPty, timer: NodeJS.Timeout }>();

export const createTerminalProcess = (command: string,
  args: string[]): { terminalId: string, proc: pty.IPty } => {
  const isWin = os.platform() === "win32";
  const shell = isWin ? "powershell.exe" : "/bin/bash";
  const cmdline = [command, ...args].map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(" ");
  const shellArgs = isWin ? ["-Command", cmdline] : ["-lc", cmdline];

  // const terminalId = randomUUID();
  const terminalId = "8eebf62f-136b-49fe-a7fc-4ec8e2e46b91";

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
export const getTerminalOutput = async (proc: pty.IPty): Promise<RawTerminalOutputType> => {
  let buffer = "";
  let lastOutputTime = Date.now();
  const startTime = Date.now();
  let hasEnded = false;

  const disposableData = proc.onData((data) => {
    buffer += data;
    lastOutputTime = Date.now();
  });

  const disposableExit = proc.onExit(() => {
    hasEnded = true;
  });

  while (true) {
    if (hasEnded) {
      disposableData.dispose();
      disposableExit.dispose();
      return { output: buffer, hasEnded: true, isPrinting: false, isIdle: false };
    }

    const now = Date.now();
    const isIdle = now - lastOutputTime >= TERMINAL_MAX_IDLE;
    const isTimeout = now - startTime >= TERMINAL_MAX_WAIT;

    if (isIdle || isTimeout) {
      disposableData.dispose();
      disposableExit.dispose();
      return {
        output: buffer,
        hasEnded,
        isIdle,
        isPrinting: !isIdle
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Write string to terminal character by character, waiting for each to be registered.
 * Ends with a carriage return.
 * @param proc - The terminal process to write to.
 * @param stringInput - The string to write to the terminal.
 */
export const enterPrompt = async (proc: pty.IPty, stringInput: string): Promise<void> => {
  // Sanitize input to remove control characters (0x00-0x1F, 0x7F)
  const sanitized = sanitizeStringInput(stringInput);

  // Write each character individually and wait for it to be "registered" (echoed or timeout)
  for (const char of sanitized) {
    await new Promise<void>((resolve) => {
      const disposable = proc.onData(() => {
        disposable.dispose();
        resolve();
      });
      proc.write(char);

      // Fallback timeout in case there's no echo/output for the character
      setTimeout(() => {
        disposable.dispose();
        resolve();
      }, 100);
    });
  }

  // Final enter
  proc.write("\r");
};

/**
 * Select an option from the terminal using down arrow key, waiting for each arrow key to be "registered" (echoed or timeout).
 * Ends with a carriage return.
 * @param proc - The terminal process to write to.
 * @param optionIndex - The index of the option to select.
 */
export const enterOption = async (proc: pty.IPty, optionIndex: number): Promise<void> => {
  const downArrow = "\u001b[B";

  // Write each character individually and wait for it to be "registered" (echoed or timeout)
  for (let i = 0; i < optionIndex; i++) {
    await new Promise<void>((resolve) => {
      const disposable = proc.onData(() => {
        disposable.dispose();
        resolve();
      });
      proc.write(downArrow);

      // Fallback timeout in case there's no echo/output for the character
      setTimeout(() => {
        disposable.dispose();
        resolve();
      }, 100);
    });
  }

  // Final enter
  proc.write("\r");
};

/**
 * Selects multiple options from the terminal using down arrow key and spacebar, waiting for each arrow key to be "registered" (echoed or timeout).
 * Ends with a carriage return.
 * @param proc - The terminal process to write to.
 * @param choices - Array of booleans representing whether to select the option at the corresponding index.
 */
export const enterMultipleOptions = async (proc: pty.IPty, choices: boolean[]): Promise<void> => {
  const downArrow = "\u001b[B";
  const spaceBar = " ";

  // Write each character individually and wait for it to be "registered" (echoed or timeout)
  for (let i = 0; i < choices.length; i++) {
    if (choices[i]) {
      await new Promise<void>((resolve) => {
        const disposable = proc.onData(() => {
          disposable.dispose();
          resolve();
        });
        proc.write(spaceBar);

        // Fallback timeout in case there's no echo/output for the character
        setTimeout(() => {
          disposable.dispose();
          resolve();
        }, 100);
      });
    }

    await new Promise<void>((resolve) => {
      const disposable = proc.onData(() => {
        disposable.dispose();
        resolve();
      });
      proc.write(downArrow);

      // Fallback timeout in case there's no echo/output for the character
      setTimeout(() => {
        disposable.dispose();
        resolve();
      }, 100);
    });
  }

  // Final enter
  proc.write("\r");
};