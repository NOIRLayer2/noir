# NOIR

[![license](https://img.shields.io/badge/license-MIT-00c805)](LICENSE) [![node](https://img.shields.io/badge/node-%E2%89%A5%2022-00c805)](.node-version) [![contract tests](https://img.shields.io/badge/contract%20tests-12-00c805)](contracts/test) [![tests](https://img.shields.io/badge/end--to--end%20checks-89-00c805)](test)

**[noirlayer2.xyz](https://noirlayer2.xyz)** · [Docs](https://noirlayer2.xyz/docs) · [Changelog](CHANGELOG.md) · [Security](SECURITY.md)

A private layer 2 on Robinhood Chain. Balances, payments, trades and launches stay private, and every block is sealed to Robinhood Chain.

- **The chain.** Signed transactions, one block a second, a Merkle state root in every block, an ed25519 producer signature on every block.
- **The seal.** Every ten seconds a receipt of the newest blocks is written to the `NoirSettlement` contract, which refuses any receipt that skips a block and recomputes the hash chain itself.
- **The door.** The same contract. ETH comes in with a plain transfer and leaves through payouts that the contract lets happen once per id.
- **Four rooms.** Hold, Pay (transfers and pay links), Trade (bonding curves), Launch.

One Node.js program and one Solidity contract. One dependency (viem) for writing to Robinhood Chain; wallet signatures are checked by hand.

## Quick start

```bash
git clone https://github.com/NOIRLayer2/noir
cd noir
npm install
npm start          # http://localhost:8314
npm test           # 65 end-to-end checks against a throwaway node
```

Node 22 or newer. `node test/dev.js` starts a local preview with a few coins trading.

## How it fits together

```
browser ──signed tx──▶ front door (server/start.js) ──▶ node (server/index.js)
                                                          │
                              chain core (server/core.js) ┤  blocks, state root, receipts
                                 bridge (server/bridge.js)┤  deposits in, pay-once withdrawals out
                              EVM adapter (server/evm.js) ──▶ Robinhood Chain (NoirSettlement: door and seal)
```

| Path | What it is |
|---|---|
| `server/core.js` | Accounts, signed transactions with nonces, blocks with Merkle roots, the curve, pay links, receipts |
| `server/evm.js` | Robinhood Chain: keccak-256 and secp256k1 recovery by hand, deposits, payouts, receipts |
| `contracts/src/NoirSettlement.sol` | The door and the seal on Robinhood Chain |
| `server/bridge.js` | The door and the seal |
| `server/index.js` | Open API, owner-only API, live block stream, MCP endpoint |
| `server/start.js` | Front door: serves the site, proxies the API, restarts the node, answers reads from a last-good copy |
| `client/` | Landing page, app, explorer and docs |
| `test/` | End-to-end suites |

## Configuration

| Variable | What it does |
|---|---|
| `PORT` | Port to listen on. Default 8312. |
| `DATA_PATH` | Where the chain state file lives. Put it on a persistent disk. |
| `RPC_URL` | Robinhood Chain RPC. Default is the public mainnet endpoint. |
| `SETTLEMENT_ADDRESS` | The deployed `NoirSettlement` contract. It is the door and the seal. |
| `SETTLEMENT_FROM_BLOCK` | Block the contract was deployed in, so deposits are scanned from there. |
| `AUTHORITY_KEY` | Private key of the chain authority. It writes receipts and pays withdrawals. |
| `TOKEN_MINT` | Contract address shown on the site. |

Keys are read from the environment only. Never commit them.

## Contract

```bash
cd contracts
forge test          # 12 tests: ordering, replay, the hash chain against the off-chain formula, deposits, pay-once, reentrancy, authority handover
forge create src/NoirSettlement.sol:NoirSettlement --rpc-url https://rpc.mainnet.chain.robinhood.com --private-key <deployer key> --broadcast --constructor-args <authority address>
```

## Tests

```bash
npm test                 # 65 checks: signatures, nonces, transfers, pay links, the curve, withdrawals, block hashes,
                         # producer signatures, the receipt hash chain, malformed requests and a restart
node test/front.js       # 24 checks: the site keeps answering while the node behind it is stopped
```

## API

Open JSON API, owner-only API behind a wallet signature, a live block stream and an MCP endpoint at `/mcp`. See `/docs` on a running node.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Security reports go through [private reporting](https://github.com/NOIRLayer2/noir/security/advisories/new).

## License

[MIT](LICENSE)
