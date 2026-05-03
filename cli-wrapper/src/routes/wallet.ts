import { Hono } from 'hono';
import { createWalletStart } from '../commands/wallet/create.js';

export const walletRoutes = new Hono();

// curl -X POST http://localhost:3000/wallet/create
walletRoutes.post('/create', async (c) => {
  const walletStartResult = await createWalletStart();
  return c.json(walletStartResult);
});

