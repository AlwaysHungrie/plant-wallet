# plant-wallet

Autonomous Solana stablecoin wallet. Splits your USDC holdings between liquid working capital and an idle yield position (JLP). Rebalances hourly. Adjusts the working/idle split daily based on real spending patterns — so you never run out of liquid funds and idle money is always working.

---

## How it works

### Capital split

Your holdings are tracked in two buckets:

| Bucket | Token | Role |
|--------|-------|------|
| Working capital | USDC | Liquid — ready to send immediately |
| Idle capital | JLP (Jupiter Liquidity Pool) | Yield-bearing — earns trading fees |

The **target ratio** (`tr`) controls what fraction of total value sits in JLP. Default is 50%. Range is 10%–90%.

### Hourly rebalance

Every hour, plant-wallet checks whether the current JLP/USDC split has drifted more than 2% from the target ratio. If it has, it swaps USDC↔JLP via Jupiter to restore the target. Swaps below $1 are skipped.

- JLP ratio too high → sell JLP, receive USDC
- USDC ratio too high → buy JLP with USDC

### Daily ratio adjustment

Every midnight UTC, plant-wallet looks at how many hours in the past day required a JLP redemption to cover a send request. It adjusts the target ratio based on that usage:

| Redemption rate | Action |
|-----------------|--------|
| > 20% of hours | Raise JLP ratio by 5% (less liquid needed → put more in yield) |
| < 5% of hours | Lower JLP ratio by 5% (more liquid needed → keep more in USDC) |
| 5%–20% | No change |

This means the wallet learns your spending patterns and self-optimises over time.

### Sending USDC

When you call `POST /send`, the wallet:
1. Checks if USDC balance covers the amount
2. If not, redeems just enough JLP (+ 1% slippage buffer) to cover the shortfall
3. Sends USDC via Zerion CLI
4. Records the redemption hour for daily ratio tracking

---

## Architecture

```
plant-wallet/
├── primary wallet    — holds USDC + JLP, executes all swaps and sends
├── reserve wallet    — secondary wallet (managed separately)
├── Express server    — HTTP API on port 4000
├── Hourly cron       — rebalance (0 * * * *)
├── Daily cron        — ratio adjust (0 0 * * *)
└── data/wallet-state.json — persists state across restarts
```

Swaps go through the Jupiter Ultra API. Wallet operations (send, list) go through the Zerion CLI.

---

## Prerequisites

- Node.js ≥ 20
- Zerion CLI installed globally:
  ```bash
  npm install -g zerion-cli
  ```
- A Zerion API key — get one at [dashboard.zerion.io](https://dashboard.zerion.io)
- A Jupiter API key — get one at [jup.ag](https://jup.ag)
- A Solana RPC endpoint — [Helius](https://helius.dev) recommended for reliability

---

## Setup

### 1. Install Zerion CLI

```bash
npm install -g zerion-cli
```

### 2. Configure Zerion API key

```bash
zerion config set apiKey zk_...
```

### 3. Create agent policy

Allows the CLI to sign transactions on Solana without passphrase prompts.

```bash
zerion agent create-policy --name agent-policy --chains solana --expires 365000d
```

### 4. Create wallets

```bash
zerion wallet create --name primary
zerion wallet create --name reserve
```

### 5. Set up environment

```bash
cp .env.example .env
# edit .env with your JUP_API_KEY and RPC_URL
```

### 6. Fund the primary wallet

Get the deposit address:

```bash
zerion wallet fund --wallet primary
```

Send USDC to that address on Solana mainnet.

### 7. Install dependencies and start

```bash
npm install
npm run dev
```

Server starts on `http://localhost:4000`.

---

## Environment variables

Create a `.env` file in the `plant-wallet/` directory:

```env
JUP_API_KEY=your_jupiter_api_key
RPC_URL=https://mainnet.helius-rpc.com/?api-key=your_helius_key
PORT=4000
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JUP_API_KEY` | **Yes** | — | Jupiter swap API key ([jup.ag](https://jup.ag)) |
| `RPC_URL` | No | Solana mainnet public RPC | Custom Solana RPC endpoint. Helius recommended for reliability. |
| `PORT` | No | `4000` | HTTP server port |
| `ZERION_API_KEY` | **Yes** | — | Set via `zerion config set apiKey` or as env var. Required for wallet sends. |

---

## API

### `GET /`

Returns current wallet state.

```json
{
  "message": "plant-brain online",
  "primaryWallet": "...",
  "reserveWallet": "...",
  "balance": {
    "usdc": 142.50,
    "jlp_usdc_value": 157.80,
    "total": 300.30
  },
  "strategy": {
    "targetRatio": 0.5,
    "currentRatio": 0.5256,
    "redemptionHoursToday": 2
  },
  "timestamps": {
    "lastRebalancedAt": "2025-01-15T12:00:00.000Z",
    "lastRatioAdjustedAt": "2025-01-15T00:00:00.000Z"
  }
}
```

### `POST /send`

Send USDC from the primary wallet. Automatically redeems JLP if working capital is insufficient.

**Request body:**
```json
{
  "to": "SolanaAddressHere...",
  "amount": 50.00
}
```

**Response:**
```json
{
  "ok": true,
  "signature": "5KtPn1...",
  "usdcSent": 50.00
}
```

**Error responses:**
- `400` — invalid address or negative amount
- `400` — insufficient funds (USDC + JLP combined)
- `500` — swap or send failed

---

## State file

State persists to `data/wallet-state.json` and survives restarts.

| Field | Type | Description |
|-------|------|-------------|
| `usdc` | number | Liquid USDC balance |
| `ausdc` | number | JLP position value in USDC terms |
| `tr` | number | Target ratio (JLP / total), 0.10–0.90 |
| `redemptionHours` | number | Hours today that required JLP redemption |
| `lastRedemptionHour` | number | UTC hour of last redemption (dedup guard) |
| `lastRebalancedAt` | ISO string | Timestamp of last rebalance |
| `lastRatioAdjustedAt` | ISO string | Timestamp of last ratio adjustment |
| `primaryWallet` | string | Solana address of primary wallet |
| `reserveWallet` | string | Solana address of reserve wallet |

---

## Cron schedule

| Schedule | Task |
|----------|------|
| `0 * * * *` (hourly) | Sync balances from chain, rebalance USDC↔JLP if drift > 2% |
| `0 0 * * *` (daily midnight UTC) | Adjust target ratio based on redemption rate, reset `redemptionHours` |

---

## Scripts

| Script | Command |
|--------|---------|
| `npm run dev` | `ts-node src/index.ts` — development with live TypeScript |
| `npm run build` | `tsc` — compile to `dist/` |
| `npm start` | `node dist/index.js` — production |
| `npm run typecheck` | `tsc --noEmit` — type check without compiling |
