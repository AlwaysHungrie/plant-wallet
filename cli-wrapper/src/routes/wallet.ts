import { Hono } from 'hono';
import { createWalletStart, enterPassphrase } from '../commands/wallet/create.js';

export const walletRoutes = new Hono();

// curl -X POST http://localhost:3000/wallet/create
walletRoutes.post('/create', async (c) => {
  const output = await createWalletStart();
  return c.json({
    output
  });
});

// curl -X POST http://localhost:3000/wallet/passphrase -H "Content-Type: application/json" -d "{\"terminalId\": \"your-terminal-id\", \"passphrase\": \"your-passphrase\"}"
walletRoutes.post('/passphrase', async (c) => {
  const { terminalId, passphrase } = await c.req.json();
  const { output, timed_out, has_ended, is_printing } = await enterPassphrase(terminalId, passphrase);
  return c.json({
    output,
    timed_out,
    has_ended,
    is_printing
  });
})