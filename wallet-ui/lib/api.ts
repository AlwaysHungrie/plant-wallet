import type { ParsedTerminalOutput } from './types';

const BASE = 'http://localhost:3000';

export async function createWallet(): Promise<ParsedTerminalOutput> {
  const res = await fetch(`${BASE}/wallet/create`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to create wallet: ${res.status}`);
  return res.json();
}

export async function sendTextInput(terminalId: string, textInput: string): Promise<ParsedTerminalOutput> {
  const res = await fetch(`${BASE}/terminal/text-input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ terminalId, textInput }),
  });
  if (!res.ok) throw new Error(`Text input failed: ${res.status}`);
  return res.json();
}

export async function selectOption(terminalId: string, option: number): Promise<ParsedTerminalOutput> {
  const res = await fetch(`${BASE}/terminal/select-option`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ terminalId, option }),
  });
  if (!res.ok) throw new Error(`Select option failed: ${res.status}`);
  return res.json();
}

export async function selectMultiple(terminalId: string, choices: boolean[]): Promise<ParsedTerminalOutput> {
  const res = await fetch(`${BASE}/terminal/select-multiple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ terminalId, choices }),
  });
  if (!res.ok) throw new Error(`Select multiple failed: ${res.status}`);
  return res.json();
}
