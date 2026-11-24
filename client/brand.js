// Everything that names this chain in the browser. The rest of the client reads from here.
window.BRAND = {
  name: 'NOIR', ticker: '$NOIR', tag: 'NOIR', chainId: 'noir-1', settles: 'Robinhood Chain', asset: 'ETH', decimals: 18, wallet: 'evm', walletName: 'wallet',
  evmChainId: 4663, evmAdd: { chainId: '0x1237', chainName: 'Robinhood Chain', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://rpc.mainnet.chain.robinhood.com'], blockExplorerUrls: ['https://explorer.mainnet.chain.robinhood.com'] },
  x: '', buy: '',
  tx: (id) => 'https://explorer.mainnet.chain.robinhood.com/tx/' + id, account: (a) => 'https://explorer.mainnet.chain.robinhood.com/address/' + a,
  // scene: a smaller moon crossing from the lower left leaves a ring of green fire
  scene: { a: [0.0, 0.80, 0.05], b: [0.80, 1.0, 0.10], hot: [0.94, 1.0, 0.88], rays: 0.4, moon: 0.9, path: [-3.6, -1.3], ring: [0.45, 1.0, 0.40], sealed: [0.86, 1.0, 0.20] },
};
