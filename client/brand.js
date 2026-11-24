// Everything that names this chain in the browser. The rest of the client reads from here.
window.BRAND = {
  name: 'NOIR', ticker: '$NOIR', tag: 'NOIR', chainId: 'noir-1', settles: 'Robinhood Chain', asset: 'ETH', decimals: 18, wallet: 'evm', walletName: 'wallet',
  evmChainId: 4663, evmAdd: { chainId: '0x1237', chainName: 'Robinhood Chain', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://rpc.mainnet.chain.robinhood.com'], blockExplorerUrls: ['https://explorer.mainnet.chain.robinhood.com'] },
  x: '', github: 'https://github.com/NOIRLayer2/noir', buy: '',
  faqDoor: 'Send ETH from your wallet on Robinhood Chain into the NoirSettlement contract, which is the door. NOIR credits the same address in a system transaction a few seconds after Robinhood Chain confirms it. To leave, sign a withdrawal naming any Robinhood Chain address: the amount leaves your balance in the same block and the contract pays it out as ETH. The contract lets each payout id be paid exactly once, and a payout that can never succeed is refunded on NOIR.',
  faqSeal: 'Every ten seconds NOIR writes a receipt to the NoirSettlement contract on Robinhood Chain covering its newest blocks: the block range, a Merkle root over the block hashes, the state root, the last block hash and the transaction count. The contract accepts receipts only from the chain authority, recomputes the hash chain itself and emits every field in an event.',
  tx: (id) => 'https://explorer.mainnet.chain.robinhood.com/tx/' + id, account: (a) => 'https://explorer.mainnet.chain.robinhood.com/address/' + a,
  // scene: a smaller moon crossing from the lower left leaves a ring of green fire
  scene: { a: [0.0, 0.80, 0.05], b: [0.80, 1.0, 0.10], hot: [0.94, 1.0, 0.88], rays: 0.4, moon: 0.9, path: [-3.6, -1.3], ring: [0.45, 1.0, 0.40], sealed: [0.86, 1.0, 0.20] },
};
