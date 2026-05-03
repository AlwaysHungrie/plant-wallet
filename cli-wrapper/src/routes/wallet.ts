import { Hono } from 'hono';
import { createTerminalProcess, getTerminalOutput } from '../services/terminal-service.js';
import { parseRawOutput } from '../services/output-parsing.js';

export const walletRoutes = new Hono();

// curl -X POST http://localhost:3000/wallet/run -H "Content-Type: application/json" -d '{"subcommand":"create","args":["--name","trading-bot"]}'
walletRoutes.post('/run', async (c) => {
  try {
    const { subcommand, args = [] } = await c.req.json<{ subcommand: string; args?: string[] }>();
    if (!subcommand) {
      return c.json({ error: 'subcommand is required' }, 400);
    }
    const { terminalId, proc } = createTerminalProcess('zerion', ['wallet', subcommand, ...args]);
    const terminalOutput = await getTerminalOutput(proc);
    const response = parseRawOutput(terminalOutput, terminalId);
    return c.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});
