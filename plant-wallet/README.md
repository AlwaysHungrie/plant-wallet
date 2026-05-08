# plant-wallet

USDC wallet that maintains a configurable split between liquid USDC (working capital) and JLP (idle capital earning yield). The split rebalances automatically on a schedule and adjusts its own target ratio based on how often liquid funds actually get used.

---

## How it works

### Capital split

Holdings are divided into two positions on the primary Solana wallet:

| Position | Token | Role |
|----------|-------|------|
| Working capital | USDC | Liquid — available to send immediately |
| Idle capital | JLP (Jupiter Liquidity Pool token) | Yield-bearing — earns LP fees passively |

The **target ratio** (`tr`) is the fraction of total value held in JLP. Default: `0.5` (50%). Clamped to `[0.10, 0.90]`.

### Hourly rebalance

Every hour the server reads on-chain balances, computes the current JLP/total ratio, and compares it to `tr`. If the drift exceeds 2%, it executes a swap via Jupiter:

- Current ratio > `tr` by >2%: sell JLP → USDC
- Current ratio < `tr` by >2%: buy JLP with USDC

Swaps with a notional value below $1 are skipped.

### Daily ratio adjustment

At midnight UTC, the server counts how many distinct hours in the past day required a JLP redemption to cover a send (i.e. USDC balance was insufficient). Based on that redemption rate:

| Redemption rate | Adjustment |
|-----------------|------------|
| > 20% of hours | Increase `tr` by 5% — more JLP, less idle USDC |
| < 5% of hours | Decrease `tr` by 5% — more USDC, less JLP |
| 5%–20% | No change |

Over time this converges the split toward your actual spending pattern.

### Send flow

`POST /send` triggers:

1. If USDC balance ≥ requested amount: send directly.
2. If USDC balance < requested amount: redeem enough JLP to cover the shortfall (with a 1% slippage buffer), then send.
3. Record which UTC hour the redemption occurred (deduplicated) for the daily ratio tracker.

---

## Architecture

```
plant-wallet/
├── src/
│   ├── index.ts           Express server, bootstrap checks
│   ├── lib/
│   │   ├── jupiter.ts     Jupiter Ultra API — swap quotes and execution
│   │   ├── rpc.ts         Solana RPC — on-chain balance reads
│   │   └── zerion.ts      Zerion CLI — wallet list, USDC send
│   ├── services/
│   │   ├── wallet.ts      State load/save/sync
│   │   ├── swap.ts        USDC↔JLP swap execution
│   │   ├── rebalance.ts   Hourly rebalance logic
│   │   └── ratioAdjust.ts Daily ratio adjustment logic
│   ├── routes/
│   │   ├── status.ts      GET /
│   │   └── send.ts        POST /send
│   └── cron/
│       ├── hourly.ts      0 * * * *  — rebalance
│       └── daily.ts       0 0 * * *  — ratio adjust
└── data/
    └── wallet-state.json  Persisted state
```

Two wallets are required:
- `primary` — holds USDC and JLP, executes swaps and sends
- `reserve` — secondary wallet, currently used for address tracking

---

## Requirements

- Node.js ≥ 20
- `zerion-cli` installed globally (`npm install -g zerion-cli`)
- Zerion API key — [dashboard.zerion.io](https://dashboard.zerion.io)
- Jupiter API key — [jup.ag](https://jup.ag)
- Solana RPC endpoint — [Helius](https://helius.dev) recommended

---

## Setup

**1. Install Zerion CLI**

```bash
npm install -g zerion-cli
```

**2. Configure Zerion API key**

```bash
zerion config set apiKey zk_...
```

**3. Create an agent policy** (allows unattended Solana transactions)

```bash
zerion agent create-policy --name agent-policy --chains solana --expires 365000d
```

**4. Create wallets**

```bash
zerion wallet create --name primary
zerion wallet create --name reserve
```

**5. Configure environment**

```bash
cp .env.example .env
# fill in JUP_API_KEY and RPC_URL
```

**6. Get primary wallet deposit address**

```bash
zerion wallet fund --wallet primary
```

Send USDC to that address on Solana mainnet.

**7. Install and start**

```bash
npm install
npm run dev
```

Server on `http://localhost:4000`.

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JUP_API_KEY` | Yes | — | Jupiter API key |
| `RPC_URL` | No | `https://api.mainnet-beta.solana.com` | Solana RPC endpoint |
| `PORT` | No | `4000` | HTTP server port |
| `ZERION_API_KEY` | Yes | — | Zerion API key — set via `zerion config set apiKey` or directly as env var |

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

---

### `POST /send`

Send USDC from the primary wallet. Redeems JLP automatically if USDC balance is insufficient.

**Request**
```json
{ "to": "<solana-address>", "amount": 50.00 }
```

**Response**
```json
{ "ok": true, "signature": "5KtPn1...", "usdcSent": 50.00 }
```

**Errors**

| Status | Condition |
|--------|-----------|
| `400` | Invalid Solana address |
| `400` | `amount` ≤ 0 or wrong type |
| `400` | Insufficient funds (USDC + JLP combined) |
| `500` | Swap or send failed |

---

## State file

`data/wallet-state.json` persists across restarts.

| Field | Type | Description |
|-------|------|-------------|
| `usdc` | number | Liquid USDC balance |
| `ausdc` | number | JLP position value in USDC |
| `tr` | number | Target JLP ratio, range `[0.10, 0.90]` |
| `redemptionHours` | number | Hours this day with a JLP redemption |
| `lastRedemptionHour` | number | UTC hour of last redemption (dedup) |
| `lastRebalancedAt` | ISO string | Last rebalance timestamp |
| `lastRatioAdjustedAt` | ISO string | Last ratio adjustment timestamp |
| `primaryWallet` | string | Solana address, primary |
| `reserveWallet` | string | Solana address, reserve |

---

## Cron

| Expression | Task |
|------------|------|
| `0 * * * *` | Sync on-chain balances, rebalance if drift > 2% |
| `0 0 * * *` | Adjust target ratio, reset `redemptionHours` |

---

## Scripts

```
npm run dev        ts-node src/index.ts
npm run build      tsc
npm start          node dist/index.js
npm run typecheck  tsc --noEmit
```
