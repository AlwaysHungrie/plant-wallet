import type { ParsedTerminalOutput, RawTerminalOutputType, USER_ACTION_TYPES } from "../types/terminal-types.js";

export const sanitizeStringInput = (input: string): string => {
  return input.replace(/[\x00-\x1F\x7F]/g, "");
}

export const sanitizeOutputString = (input: string): string => {
  return input
    // Remove ANSI escape codes
    .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "")
    // Remove carriage returns
    .replace(/\r/g, "")
    // Remove backspaces
    .replace(/\x08/g, "");
};

export const extractOptions = (outputLines: string[]): { updatedOutputLines: string[], availableOptions: string[] } => {
  const optionsStartIndex = outputLines.findLastIndex(line => line.startsWith(">"));
  const options = outputLines.splice(optionsStartIndex)

  return { updatedOutputLines: outputLines, availableOptions: options };
}

export const parseRawOutput = (rawOutput: RawTerminalOutputType, terminalId: string): ParsedTerminalOutput => {
  const { output: rawOutputString, hasEnded, isPrinting } = rawOutput;

  const sanitizedOutput = sanitizeOutputString(rawOutputString);

  console.log("sanitizedOutput", sanitizedOutput);

  const outputLines = sanitizedOutput.split("\n").map(line => line.trim()).filter(line => line.length > 0);

  if (outputLines.length === 0) {
    if (hasEnded) {
      return { output: sanitizedOutput, error: "TERMINAL_EXITED" };
    }
    return { output: sanitizedOutput };
  }

  const lastLine = outputLines.splice(outputLines.length - 1)[0];

  console.log("lastLine", lastLine, lastLine?.startsWith("↑/↓ navigate"));

  const output = outputLines.join("\n");

  if (lastLine.endsWith(":")) {
    return {
      output,
      userAction: {
        type: "TEXT_INPUT",
        prompt: lastLine,
        terminalId
      }
    }
  }

  if (lastLine.startsWith("↑/↓ navigate")) {
    const { updatedOutputLines, availableOptions } = extractOptions(outputLines);

    let type: typeof USER_ACTION_TYPES[number] = "SELECT_OPTION";
    if (lastLine.startsWith("↑/↓ navigate · Space toggle")) {
      type = "SELECT_MULTIPLE_OPTIONS";
    }

    return {
      output: updatedOutputLines.join("\n"),
      userAction: {
        type,
        prompt: lastLine,
        terminalId,
        availableOptions,
      }
    }
  }

  if (isPrinting) {
    return { output: sanitizedOutput, error: "TERMINAL_TIMEOUT" };
  }

  return {
    output: sanitizedOutput,
  };
};