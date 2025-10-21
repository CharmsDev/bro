/**
 * Storage Module - Centralized localStorage management
 * 
 * Use domain-specific storage classes for convenience:
 * - WalletStorage: Wallet data and addresses
 * - MiningStorage: Mining and Turbomining data
 * - TurbomintingStorage: Minting loop and funding data
 * 
 * Or use CentralStorage directly for low-level access
 */

import CentralStorage from './CentralStorage.js';
import { WalletStorage } from './WalletStorage.js';
import { MiningStorage } from './MiningStorage.js';
import { TurbomintingStorage } from './TurbomintingStorage.js';

// Main export - core storage
export default CentralStorage;

// Named exports - domain-specific storage
export {
  CentralStorage,
  WalletStorage,
  MiningStorage,
  TurbomintingStorage
};
