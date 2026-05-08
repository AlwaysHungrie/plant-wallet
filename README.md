# plant-wallet

Stablecoin wallet infrastructure for Solana. Splits holdings between liquid USDC and a yield-bearing JLP position, rebalances the split hourly, and adjusts the target ratio daily based on observed spending. Built on Zerion CLI.

<!-- demo gif -->
![demo](./demo.gif)

---

## Packages

| Package | Description |
|---------|-------------|
| [`cli/`](./cli/) | Zerion CLI (forked) — wallet management, trading, on-chain analysis |
| [`cli-wrapper/`](./cli-wrapper/) | HTTP server that exposes every CLI command — including interactive ones — as JSON endpoints |
| [`wallet-ui/`](./wallet-ui/) | Next.js web UI built on top of cli-wrapper |
| [`plant-wallet/`](./plant-wallet/) | Autonomous USDC wallet — yield on idle capital, auto-rebalance, usage-driven ratio adjustment |

---

## Zerion CLI

Forked from [zeriontech/zerion-ai](https://github.com/zeriontech/zerion-ai).

Docs: [developers.zerion.io](https://developers.zerion.io/introduction)

```bash
npm install -g zerion-cli
```

---

## cli-wrapper

→ [cli-wrapper/README.md](./cli-wrapper/README.md)

---

## wallet-ui

→ [wallet-ui/README.md](./wallet-ui/README.md)

---

## plant-wallet

→ [plant-wallet/README.md](./plant-wallet/README.md)

---

## License

MIT — see [LICENSE](./LICENSE).
