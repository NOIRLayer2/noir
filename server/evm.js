// Robinhood Chain: wallet signatures checked by hand (keccak-256 + secp256k1 recovery), and the
// NoirSettlement contract that is both the door (ETH in, payouts out, each once) and the seal (receipts).
import { createHash } from 'node:crypto';
import { createPublicClient, createWalletClient, http, defineChain, encodeFunctionData, keccak256, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import evmsig from './evmsig.cjs';

const RPC_URL = process.env.RPC_URL || 'https://rpc.mainnet.chain.robinhood.com', CHAIN_ID = +process.env.CHAIN_ID || 4663, EXPLORER = process.env.EXPLORER || 'https://explorer.mainnet.chain.robinhood.com';
const isAddress = (s) => typeof s === 'string' && /^0x[0-9a-fA-F]{40}$/.test(s), norm = (s) => s.toLowerCase();
const CONTRACT = isAddress(process.env.SETTLEMENT_ADDRESS || '') ? norm(process.env.SETTLEMENT_ADDRESS) : null, FROM_BLOCK = BigInt(process.env.SETTLEMENT_FROM_BLOCK || 0);
const ABI = parseAbi([
  'event Sealed(uint64 indexed from, uint64 indexed to, bytes32 blocksRoot, bytes32 stateRoot, bytes32 lastBlockHash, uint64 txCount, bytes32 checkpoint)',
  'event Deposited(address indexed from, uint256 amount)',
  'function seal(uint64 from, uint64 to, bytes32 blocksRoot, bytes32 stateRoot_, bytes32 lastBlockHash, uint64 txCount)',
  'function payout(bytes32 id, address to, uint256 amount)',
  'function paid(bytes32) view returns (bool)', 'function lastTo() view returns (uint64)', 'function checkpoint() view returns (bytes32)',
]);
let AUTH = null; try { const k = (process.env.AUTHORITY_KEY || '').trim(); if (k) AUTH = privateKeyToAccount(k.startsWith('0x') ? k : '0x' + k); } catch (e) { console.error('AUTHORITY_KEY could not be read: ' + e.message); }
const rh = defineChain({ id: CHAIN_ID, name: 'Robinhood Chain', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [RPC_URL] } } });
const tr = () => http(RPC_URL, { retryCount: 3, retryDelay: 800, timeout: 20_000 }), pub = createPublicClient({ chain: rh, transport: tr() }), wal = AUTH ? createWalletClient({ chain: rh, account: AUTH, transport: tr() }) : null;
const ready = !!(CONTRACT && AUTH), h32 = (hex) => '0x' + hex, payId = (w) => '0x' + createHash('sha256').update('noir-1:' + w.id).digest('hex');
const read = (functionName, args = []) => pub.readContract({ address: CONTRACT, abi: ABI, functionName, args });

// One settlement transaction at a time, so two writers never sign with the same nonce.
let lock = Promise.resolve();
const serial = (fn) => { const run = lock.then(fn, fn); lock = run.catch(() => {}); return run; };
async function sign(data) {
  const nonce = await pub.getTransactionCount({ address: AUTH.address, blockTag: 'pending' }), gas = await pub.estimateGas({ account: AUTH.address, to: CONTRACT, data }), fees = await pub.estimateFeesPerGas().catch(() => null), gasPrice = fees?.maxFeePerGas ? null : await pub.getGasPrice();
  const raw = await wal.signTransaction({ to: CONTRACT, data, nonce, gas: gas * 13n / 10n, chainId: CHAIN_ID, ...(gasPrice ? { gasPrice } : { maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas }) });
  return { l1: keccak256(raw), raw, expiry: nonce };
}
const broadcast = (raw) => pub.sendRawTransaction({ serializedTransaction: raw });
let usd = { v: 0, at: 0 };

export const A = {
  port: 8314, name: 'Robinhood Chain', tag: 'NOIR', chainId: 'noir-1', asset: 'ETH', assetName: 'Ether', decimals: 18, virtualAsset: '1250000000000000000', minWithdraw: '100000000000000', minWithdrawText: '0.0001 ETH',
  isAddress, norm, verify: (addr, bytes, sig) => { try { return evmsig.recoverPersonal(Buffer.from(bytes).toString('utf8'), sig) === norm(addr); } catch { return false; } },
  door: CONTRACT, authority: AUTH?.address.toLowerCase() || null, canPay: ready, canSeal: ready, settlement: CONTRACT, settlementKind: 'Settlement contract',
  explorerTx: (id) => EXPLORER + '/tx/' + id, explorerAddress: (a) => EXPLORER + '/address/' + a,
  async usd() { if (Date.now() - usd.at > 60_000) { usd.at = Date.now(); try { const j = await (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', { signal: AbortSignal.timeout(8000) })).json(); if (j?.ethereum?.usd) usd.v = j.ethereum.usd; } catch {} } return usd.v; },
  // What one confirmed transaction deposited into the door, read from its Deposited events.
  async deposit(l1) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(l1)) return { amount: 0n };
    const rc = await pub.getTransactionReceipt({ hash: l1 }).catch(() => null); if (!rc) return null; if (rc.status !== 'success') return { amount: 0n };
    const logs = await pub.getContractEvents({ address: CONTRACT, abi: ABI, eventName: 'Deposited', blockHash: rc.blockHash }), mine = logs.filter((l) => l.transactionHash === l1); if (!mine.length) return { amount: 0n };
    return { from: norm(mine[0].args.from), amount: mine.filter((l) => l.args.from === mine[0].args.from).reduce((s, l) => s + l.args.amount, 0n) };
  },
  // Deposits the app was never told about: read the door's events block range by block range.
  ...(CONTRACT ? { async scan(cursor) {
    const head = await pub.getBlockNumber(); let from = cursor ? BigInt(cursor) + 1n : (FROM_BLOCK || head); if (from > head) return { ids: [], cursor: String(head) };
    const to = from + 4999n > head ? head : from + 4999n, logs = await pub.getContractEvents({ address: CONTRACT, abi: ABI, eventName: 'Deposited', fromBlock: from, toBlock: to });
    return { ids: [...new Set(logs.map((l) => l.transactionHash))], cursor: String(to) };
  } } : {}),
  preparePayout: (to, amount, w) => serial(() => sign(encodeFunctionData({ abi: ABI, functionName: 'payout', args: [payId(w), to, BigInt(amount)] }))),
  broadcast,
  // The contract is the last word: if it says this id was paid, it was, whatever happened to the transaction we remember.
  async status(l1, nonce, w) {
    const rc = await pub.getTransactionReceipt({ hash: l1 }).catch(() => null);
    if (rc?.status === 'success') return 'confirmed';
    if (await read('paid', [payId(w)])) return 'confirmed';
    if (rc) return 'failed';
    return (await pub.getTransactionCount({ address: AUTH.address, blockTag: 'latest' })) > nonce ? 'expired' : 'pending';
  },
  sealedTo: async () => Number(await read('lastTo')), sealedCheckpoint: async () => (await read('checkpoint')).slice(2),
  async findReceipt(to) { const head = await pub.getBlockNumber(), logs = await pub.getContractEvents({ address: CONTRACT, abi: ABI, eventName: 'Sealed', args: { to: BigInt(to) }, fromBlock: head > 4999n ? head - 4999n : 0n, toBlock: head }).catch(() => []); return logs[0]?.transactionHash || null; },
  writeReceipt: (r) => serial(async () => {
    const t = await sign(encodeFunctionData({ abi: ABI, functionName: 'seal', args: [BigInt(r.from), BigInt(r.to), h32(r.blocksRoot), h32(r.stateRoot), h32(r.lastBlockHash), BigInt(r.txs)] }));
    await broadcast(t.raw); const rc = await pub.waitForTransactionReceipt({ hash: t.l1, timeout: 90_000 }); if (rc.status !== 'success') throw new Error('receipt transaction reverted'); return t.l1;
  }),
};
