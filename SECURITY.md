# Security

The code that matters most is the signature and settlement path: every transaction is checked against its owner's wallet signature and nonce in `server/core.js` and `server/evm.js`, and every deposit, payout and receipt passes through `server/bridge.js` and the `NoirSettlement` contract.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting on this repository: [report a vulnerability](https://github.com/NOIRLayer2/noir/security/advisories/new). Include the steps to reproduce and what you observed. Please do not open a public issue for anything in the list below.

You will get an acknowledgement within 72 hours and a fix or a written assessment within 14 days.

## In scope

- Accepting a transaction whose signature does not verify, or replaying a signed one (nonce handling)
- Moving or minting balance without a valid signature from the owner
- Crediting a deposit that did not arrive, crediting one twice, or paying a withdrawal more than once
- Reading another account's private balance or history through the owner-only API
- Forging or reordering block receipts, or breaking the receipt hash chain, off-chain or in the contract
- Draining the contract, paying the same payout id twice, or taking over the authority
- Halting block production or corrupting chain state from the public API

## Supported versions

The `main` branch and the latest tag.
