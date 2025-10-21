/**
 * Modules - Modular state management with persistence and hydration
 * 
 * Each module is responsible for:
 * - Its own state management
 * - Its own persistence to CentralStorage
 * - Its own hydration on app load
 * - Its own operations
 * 
 * Industry best practice: Separation of concerns, single responsibility
 */

// Module exports
export { default as WalletModule } from './wallet/WalletModule.js';
export { default as MiningModule } from './mining/MiningModule.js';
export { default as TurbominingModule } from './turbomining/TurbominingModule.js';
export { default as TurbomintingModule } from './turbominting/TurbomintingModule.js';

// Central hydration manager
export { default as HydrationManager } from './HydrationManager.js';

// Convenience: Clear all modules
export const clearAllModules = () => {
  const { HydrationManager } = require('./HydrationManager.js');
  return HydrationManager.clearAll();
};

// Convenience: Hydrate all modules
export const hydrateAllModules = (store) => {
  const { HydrationManager } = require('./HydrationManager.js');
  return HydrationManager.hydrateAll(store);
};

// Convenience: Get all module status
export const getModuleStatus = () => {
  const { HydrationManager } = require('./HydrationManager.js');
  return HydrationManager.getStatus();
};

// Convenience: Debug all modules
export const debugModules = () => {
  const { HydrationManager } = require('./HydrationManager.js');
  return HydrationManager.debug();
};
