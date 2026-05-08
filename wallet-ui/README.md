# wallet-ui

Next.js 16 / React 19 web interface for Zerion wallet operations. Demonstrates how any web application — or an agent with browser access — can use Zerion wallet infrastructure through the cli-wrapper HTTP API, without touching the CLI directly.

Use this as a reference for building your own web frontend on top of cli-wrapper.

---

## Prerequisites

- Node.js ≥ 20
- cli-wrapper running on `http://localhost:3000` — see [cli-wrapper/README.md](../cli-wrapper/README.md)

---

## Install & run

```bash
cd wallet-ui
npm install
npm run dev
```

Opens at `http://localhost:3001` (Next.js auto-selects next available port if 3000 is taken by cli-wrapper).

---

## Environment variables

No environment variables required. The UI talks to cli-wrapper at `http://localhost:3000` — if you need to change that, update the API base URL in the source.

---

## Scripts

| Script | Command |
|--------|---------|
| `npm run dev` | Next.js dev server with hot reload |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint |
