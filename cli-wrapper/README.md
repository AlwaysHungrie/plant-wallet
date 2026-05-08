# cli-wrapper

HTTP API wrapper for the Zerion CLI. Every CLI command — including interactive ones that prompt for passphrases, numbered selections, and multi-select menus — is accessible as a JSON HTTP endpoint.

This means Telegram bots, Discord bots, Claude, OpenAI agents, and any other application can use the same Zerion wallet infrastructure that a local developer would use from a terminal. No CLI knowledge required. All state and keys stay local.

---

## Prerequisites

- Node.js ≥ 20
- Zerion CLI installed globally:
  ```bash
  npm install -g zerion-cli
  ```

---

## Install & run

```bash
cd cli-wrapper
npm install
npm run dev
```

Server starts at `http://localhost:3000`.

---

## How interactive commands work

Some CLI commands (e.g. `wallet create`) are interactive — they ask for a passphrase, present a list of options, or show multi-select checkboxes. The wrapper handles these via a stateful terminal session:

1. Start a command with `POST /wallet/run`. The response includes a `terminalId` and the initial prompt.
2. Respond to prompts by posting to the `/terminal/*` endpoints with the same `terminalId`.
3. Keep responding until the terminal session closes (no `terminalId` in response).

---

## API

All responses are JSON. Interactive commands return `{ terminalId, output, done }` — use `terminalId` for follow-up calls. Non-interactive commands return the parsed CLI JSON output directly.

### Wallet commands

#### `POST /wallet/run`

Run any `zerion wallet` subcommand.

```json
{
  "subcommand": "create",
  "args": ["--name", "trading-bot"]
}
```

```bash
curl -X POST http://localhost:3000/wallet/run \
  -H "Content-Type: application/json" \
  -d '{"subcommand":"create","args":["--name","trading-bot"]}'
```

Available subcommands mirror the CLI: `create`, `import`, `list`, `fund`, `backup`, `delete`, `sync`.

---

### Terminal (interactive) commands

Use these to respond to prompts in an active terminal session.

#### `POST /terminal/text-input`

Submit free text — passphrases, names, addresses.

```json
{
  "terminalId": "8eebf62f-136b-49fe-a7fc-4ec8e2e46b91",
  "textInput": "my-passphrase"
}
```

```bash
curl -X POST http://localhost:3000/terminal/text-input \
  -H "Content-Type: application/json" \
  -d '{"terminalId":"<id>","textInput":"my-passphrase"}'
```

#### `POST /terminal/select-option`

Pick from a numbered list (0-indexed).

```json
{
  "terminalId": "8eebf62f-136b-49fe-a7fc-4ec8e2e46b91",
  "option": 1
}
```

#### `POST /terminal/select-multiple`

Submit multi-select checkboxes as a boolean array (one entry per option).

```json
{
  "terminalId": "8eebf62f-136b-49fe-a7fc-4ec8e2e46b91",
  "choices": [false, true, false, true]
}
```

---

## Environment variables

No environment variables required by cli-wrapper itself. The server inherits the parent shell's environment, so any variables needed by the CLI (e.g. `ZERION_API_KEY`) pass through automatically.

| Variable | Set by | Purpose |
|----------|--------|---------|
| `ZERION_API_KEY` | Shell / `.env` | Zerion API authentication (passed to CLI) |

---

## Scripts

| Script | Command |
|--------|---------|
| `npm run dev` | `tsx watch src/index.ts` — hot reload |
| `npm run build` | `tsc` — compile to `dist/` |
| `npm start` | `node dist/index.js` — production |
