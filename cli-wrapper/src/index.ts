import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { isZerionInstalled } from './lib/zerion-check.js';
import { walletRoutes } from './routes/wallet.js';
import { terminalRoutes } from './routes/terminal.js';

// check if zerion is installed
isZerionInstalled();

const app = new Hono()

app.use('*', cors())

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/wallet', walletRoutes);
app.route('/terminal', terminalRoutes);

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
