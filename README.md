# tumbuh

Your stablecoin doesn't have to sit idle. Tumbuh is an autonomous Solana wallet that splits your USDC between liquid working capital and a JLP yield position — and keeps that split calibrated to how you actually spend. Money works while you sleep. Liquid when you need it.

<!-- demo gif -->
![demo](./demo.gif)

---

## What's in the box

| Project | Description |
|---------|-------------|
| [`cli/`](./cli/) | Zerion CLI (forked) — wallet management, trading, on-chain analysis |
| [`cli-wrapper/`](./cli-wrapper/) | HTTP API layer — every CLI command, including interactive ones, callable over JSON. Bots, agents, and web apps share the same wallet infra |
| [`wallet-ui/`](./wallet-ui/) | Next.js reference UI — shows cli-wrapper in action from a browser |
| [`plant-wallet/`](./plant-wallet/) | **The thing itself.** Autonomous USDC wallet with yield, auto-rebalance, and usage-driven ratio adjustment |

---

## Zerion CLI

Forked from [zeriontech/zerion-ai](https://github.com/zeriontech/zerion-ai) — the foundation everything runs on.

- **Docs:** [developers.zerion.io](https://developers.zerion.io/introduction)
- **Install:**
  ```bash
  npm install -g zerion-cli
  ```

---

## cli-wrapper

One HTTP server. Every Zerion CLI command — including interactive passphrase prompts and multi-select menus — as a clean JSON endpoint. Claude, OpenAI agents, Telegram bots, Discord bots: they all hit the same wallet infrastructure a developer would use from a terminal. No CLI plumbing required.

→ [cli-wrapper/README.md](./cli-wrapper/README.md)

---

## wallet-ui

Next.js 16 reference interface built on cli-wrapper. Proof that a browser or any web-accessible agent can drive Zerion wallet operations with zero CLI knowledge.

→ [wallet-ui/README.md](./wallet-ui/README.md)

---

## plant-wallet

Deposit USDC. Walk away. Plant-wallet splits your holdings between liquid USDC and a JLP yield position, rebalances the split every hour, and recalibrates the working/idle ratio every day based on how often you actually needed liquid funds. Run out of USDC on a send? It redeems just enough JLP to cover it, automatically.

→ [plant-wallet/README.md](./plant-wallet/README.md)

---

## License

MIT — see [LICENSE](./LICENSE).
