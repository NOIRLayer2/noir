# Changelog

All notable changes to NOIR are listed here. Versions follow [Semantic Versioning](https://semver.org).

## [Unreleased]

## [0.1.0] - 2026-11-24

First public release.

### Added

- **Chain.** Signed canonical-JSON transactions with nonces, one-second blocks with Merkle transaction and state roots, an ed25519 producer signature on every block.
- **Seal.** Block receipts written to the `NoirSettlement` contract, which enforces order and recomputes the hash chain.
- **Door.** ETH deposits into the contract and withdrawals the contract pays once per id.
- **Contract.** `NoirSettlement.sol` with 12 Foundry tests.
- **Pay.** Private transfers and pay links.
- **Trade and Launch.** A bonding-curve launchpad with a fixed supply and a creator share of fees.
- **API.** Open JSON API, owner-only routes behind a wallet signature, a live block stream and an MCP endpoint.
- **Explorer, app and docs.**
- **Front door.** The site keeps answering, and public reads come from a last-good copy, while the node restarts.

[Unreleased]: https://github.com/NOIRLayer2/noir/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/NOIRLayer2/noir/releases/tag/v0.1.0
