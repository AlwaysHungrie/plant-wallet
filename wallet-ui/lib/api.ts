import type { ParsedTerminalOutput } from './types';

const BASE = 'http://localhost:3000';

async function throwIfError(res: Response): Promise<void> {
  if (!res.ok) {
    let message: string;
    try {
      const body = await res.clone().json();
      message = body.error ?? `HTTP ${res.status}`;
    } catch {
      message = `HTTP ${res.status}`;
    }
    throw new Error(message);
  }
}

export async function runWalletCommand(subcommand: string, args: string[] = []): Promise<ParsedTerminalOutput> {
  const res = await fetch(`${BASE}/wallet/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subcommand, args }),
  });
  await throwIfError(res);
  return res.json();
}

export async function sendTextInput(terminalId: string, textInput: string): Promise<ParsedTerminalOutput> {
  const res = await fetch(`${BASE}/terminal/text-input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ terminalId, textInput }),
  });
  await throwIfError(res);
  return res.json();
}

export async function selectOption(terminalId: string, option: number): Promise<ParsedTerminalOutput> {
  const res = await fetch(`${BASE}/terminal/select-option`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ terminalId, option }),
  });
  await throwIfError(res);
  return res.json();
}

export async function selectMultiple(terminalId: string, choices: boolean[]): Promise<ParsedTerminalOutput> {
  const res = await fetch(`${BASE}/terminal/select-multiple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ terminalId, choices }),
  });
  await throwIfError(res);
  return res.json();
}
