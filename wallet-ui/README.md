# wallet-ui

Next.js 16 / React 19 frontend for Zerion wallet operations. Talks to [cli-wrapper](../cli-wrapper/README.md) over HTTP. Serves as a reference implementation for building web interfaces on top of cli-wrapper.

---

## Requirements

- Node.js ≥ 20
- cli-wrapper running on `http://localhost:3000`

---

## Running

```bash
npm install
npm run dev
```

Starts on `http://localhost:3001` by default (Next.js will increment the port if 3000 is already taken).

---

## Environment variables

None required. API base URL is hardcoded to `http://localhost:3000` — change it in the source if needed.

---

## Scripts

```
npm run dev      next dev
npm run build    next build
npm start        next start
npm run lint     eslint
```
