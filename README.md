# The Plant Wallet

This mono repo is a consists of Plant Wallet - an agentic stablecoin wallet, and Zerion-Cli-Wrapper - a api wrapper on top of [zeriontech/zerion-ai](https://github.com/zeriontech/zerion-ai).

---

## Packages

| Package                            | Description                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| [`plant-wallet/`](./plant-wallet/) | An agentic stablecoin wallet — auto balances working/idle capital ratio, passive investing  |
| [`cli/`](./cli/)                   | Zerion CLI (forked) — wallet management, trading, on-chain analysis                         |
| [`cli-wrapper/`](./cli-wrapper/)   | HTTP server that exposes every CLI command — including interactive ones — as JSON endpoints |
| [`wallet-ui/`](./wallet-ui/)       | Next.js web UI tool to navigate and use the Cli-Wrapper                                     |

---

## Plant Wallet

→ [plant-wallet/README.md](./plant-wallet/README.md)

The Plant Wallet is an Solana stablecoin wallet that automatically maintains a perfect working/idle capital ratio based on usage patterns, rebalances and passively invests your idle capital.

Plant wallet is part of a larger project [tumbuh](https://gettumbuh.com), a network of autonomous plants. It is employed by actual plants for their daily operations. And is intended to be used by other such passive agents which are not neccesarily tasked with defi trading operations, but use stablecoins for their functioning.

### Demo:

The current wallet runs on a Raspberry Pi 4. (4GB ram, 64bit)

[5RnVY4jqrWfhnHNSyAhRJBXYDKoGHVbr6gF71du1ejwj](https://explorer.solana.com/address/5RnVY4jqrWfhnHNSyAhRJBXYDKoGHVbr6gF71du1ejwj)

# TODO: Add Screenshot

## cli-wrapper

→ [cli-wrapper/README.md](./cli-wrapper/README.md)

The Cli wrapper exposes Zerion Cli over HTTP. It is useful to develop agents and applications which can have

- insolated wallet infrastructure
- running on edge devices
- serverless and interfaceless on telegram, discord etc.

# TODO: Add Gif

---

## Zerion CLI

This project is forked from [zeriontech/zerion-ai](https://github.com/zeriontech/zerion-ai). Running any of the projects requires `zerion-cli` running on your machine.

Docs: [developers.zerion.io](https://developers.zerion.io/introduction)

```bash
npm install -g zerion-cli
```

---

## License

MIT — see [LICENSE](./LICENSE).
