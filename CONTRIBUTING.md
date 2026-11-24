# Contributing

Thanks for looking. NOIR is one Node.js program and one Solidity contract.

## Getting set up

```bash
git clone https://github.com/NOIRLayer2/noir
cd noir
npm install
npm start            # http://localhost:8314
npm test             # end-to-end: real wallet signatures against a throwaway node
```

Node 22 or newer.

## Where things live

- `server/core.js` is the chain: accounts, transactions, blocks, the curve, pay links and receipts.
- `server/evm.js` is the Robinhood Chain adapter. Nothing else knows which chain NOIR settles to.
- `contracts/` holds `NoirSettlement.sol` and its Foundry tests.
- `server/bridge.js` credits deposits, pays withdrawals once and writes receipts.
- `server/index.js` is the HTTP layer; `server/start.js` is the front door that keeps the site up.
- `client/` is the site: one HTML file per page, a shared `style.css` and `common.js`.
- `test/` holds the end-to-end suites.

## Making a change

1. Branch from `dev`.
2. Keep the change small and add a check that fails without it.
3. Run `npm test` and `node test/front.js`, and `forge test` in `contracts/` if you touched the contract.
4. Open a pull request against `dev`, and say which tests you ran.

Security issues go through [private reporting](https://github.com/NOIRLayer2/noir/security/advisories/new), not pull requests.
