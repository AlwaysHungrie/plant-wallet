import { Hono } from 'hono';
import { createWalletStart, enterPassphrase, selectPolicy } from '../commands/wallet/create.js';

export const walletRoutes = new Hono();

// curl -X POST http://localhost:3000/wallet/create
walletRoutes.post('/create', async (c) => {
  const walletStartResult = await createWalletStart();
  return c.json(walletStartResult);
});

// curl -X POST http://localhost:3000/wallet/passphrase -H "Content-Type: application/json" -d "{\"terminalId\": \"8eebf62f-136b-49fe-a7fc-4ec8e2e46b91\", \"passphrase\": \"your-passphrase\"}"
walletRoutes.post('/passphrase', async (c) => {
  const { terminalId, passphrase } = await c.req.json();
  const result = await enterPassphrase(terminalId, passphrase);
  return c.json(result);
});

// curl -X POST http://localhost:3000/wallet/select-policy -H "Content-Type: application/json" -d "{\"terminalId\": \"8eebf62f-136b-49fe-a7fc-4ec8e2e46b91\", \"policy\": 1}"
walletRoutes.post('/select-policy', async (c) => {
  const { terminalId, policy, option } = await c.req.json();
  const index = option !== undefined ? option : policy;
  const result = await selectPolicy(terminalId, index);
  return c.json(result);
});
