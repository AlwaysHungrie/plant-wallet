import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { isZerionInstalled } from './lib/zerion-check.js';

// check if zerion is installed 
isZerionInstalled();

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
