// Test wallets for this chain: secp256k1 keys signing the way a wallet's personal_sign does.
import { randomBytes } from 'node:crypto';
import evmsig from '../server/evmsig.cjs';
export const TAG = 'NOIR', CHAIN_ID = 'noir-1', ASSET = 'ETH', ONE = 10n ** 18n, OUTSIDE = '0x52908400098527886e0f7030069857d2e4169ee7';
export function wallet() { const priv = BigInt('0x' + randomBytes(32).toString('hex')) % (2n ** 252n) + 1n; return { address: evmsig.pubToAddress(evmsig.mul(evmsig.G, priv)), sign: (m) => evmsig.signPersonal(m, priv) }; }
