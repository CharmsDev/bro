import { environmentConfig } from '../../config/environment.js';
import { REQUEST_TEMPLATE as MAINNET_TEMPLATE } from './constants.js';
import { REQUEST_TEMPLATE as T4_TEMPLATE } from './constants-t4.js';

// Network-aware exports for prover service
const network = environmentConfig.getNetwork?.() || import.meta.env.VITE_BITCOIN_NETWORK || 'mainnet';

export const REQUEST_TEMPLATE = network === 'testnet4' ? T4_TEMPLATE : MAINNET_TEMPLATE;

export default {
  REQUEST_TEMPLATE,
};
