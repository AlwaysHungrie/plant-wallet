# cli-wrapper

Hono HTTP server that runs Zerion CLI commands via `node-pty`. Exposes both non-interactive commands and interactive ones (passphrase prompts, numbered menus, multi-select) as JSON endpoints.

Useful when you want to drive wallet operations from an agent, a bot, or a web backend without shelling out to the CLI yourself.

---

## Requirements

- Node.js ≥ 20
- `zerion-cli` installed globally

```bash
npm install -g zerion-cli
```

---

## Running

```bash
npm install
npm run dev
```

Listens on `http://localhost:3000`.

---

## Interactive commands

Some CLI commands open a prompt loop — passphrases, choice menus, checkboxes. The wrapper models these as stateful terminal sessions:

1. `POST /wallet/run` starts the command and returns a `terminalId` plus the first output chunk.
2. Use the `/terminal/*` endpoints with that `terminalId` to respond to each prompt.
3. When the session ends, responses no longer include `terminalId`.

---

## API

### `POST /wallet/run`

Runs a `zerion wallet` subcommand. Subcommands: `create`, `import`, `list`, `fund`, `backup`, `delete`, `sync`.

**Body**
```json
{
  "subcommand": "create",
  "args": ["--name", "trading-bot"]
}
```

```bash
curl -X POST http://localhost:3000/wallet/run \
  -H "Content-Type: application/json" \
  -d '{"subcommand":"list"}'
```

---

### `POST /terminal/text-input`

Sends a text response to an active prompt (passphrase, free-form input).

**Body**
```json
{
  "terminalId": "8eebf62f-136b-49fe-a7fc-4ec8e2e46b91",
  "textInput": "my-passphrase"
}
```

---

### `POST /terminal/select-option`

Selects one item from a numbered list (0-indexed).

**Body**
```json
{
  "terminalId": "8eebf62f-136b-49fe-a7fc-4ec8e2e46b91",
  "option": 1
}
```

---

### `POST /terminal/select-multiple`

Submits a multi-select response. `choices` is a boolean array with one entry per option.

**Body**
```json
{
  "terminalId": "8eebf62f-136b-49fe-a7fc-4ec8e2e46b91",
  "choices": [false, true, false, true]
}
```

---

## Environment variables

cli-wrapper itself requires no environment variables. The server inherits the shell environment, so variables like `ZERION_API_KEY` are passed through to CLI subprocesses automatically.

| Variable | Source | Purpose |
|----------|--------|---------|
| `ZERION_API_KEY` | Shell / parent env | Zerion API auth, forwarded to CLI |

---

## Scripts

```
npm run dev      tsx watch src/index.ts
npm run build    tsc
npm start        node dist/index.js
```
