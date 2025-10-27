/**
 * CentralStorage - Core localStorage management
 * 
 * Single source of truth for ALL app data stored in 'bro_app' key
 * 
 * HIERARCHICAL STRUCTURE:
 * {
 *   "bro_app": {
 *     "wallet": { address, seedPhrase, publicKey, privateKey },
 *     "walletExtendedAddresses": { recipient: [], change: [] },
 *     
 *     "mining": { nonce, hash, leadingZeros, difficulty },
 *     
 *     "turbomining": {
 *       miningTxid, explorerUrl, miningTxConfirmed, miningData,
 *       spendableOutputs, numberOfOutputs
 *     },
 *     
 *     "turbominting": {
 *       // Mining Transaction Status
 *       miningTxid, explorerUrl, miningTxConfirmed, miningReady,
 *       confirmationInfo,
 *       
 *       // Funding Transaction (Box 2 & 3)
 *       fundingTxid, fundingExplorerUrl, fundingTxConfirmed,
 *       fundingReady, fundingBroadcasted,
 *       fundingTransaction: { txid, signedHex, outputs, decoded, inputUtxos },
 *       fundingAnalysis: { strategy, availableUtxos, resultingUtxos, currentOutputs, availableSats },
 *       
 *       // Minting Loop Progress (Box 4)
 *       mintingProgress: {
 *         completed, total,
 *         outputs: [{ index, status, miningUtxo, fundingUtxo, commitTxid, spellTxid, error }]
 *       }
 *     },
 *     
 *     "steps": { current: 1, completed: [] }
 *   }
 * }
 * 
 * NOTE: 'funding' key is DEPRECATED - all funding data now in 'turbominting'
 * NOTE: Use domain-specific storage classes (WalletStorage, MiningStorage, etc.)
 * for convenience methods. This class provides low-level access.
 */

const ROOT_KEY = 'bro_app';

class CentralStorage {
  static DEBUG = false;
  /**
   * Get the entire app state
   */
  static getAll() {
    try {
      const raw = localStorage.getItem(ROOT_KEY);
      return raw ? JSON.parse(raw) : this.getDefaultState();
    } catch (error) {
      return this.getDefaultState();
    }
  }

  /**
   * Get default empty state
   */
  static getDefaultState() {
    return {
      wallet: null,
      walletExtendedAddresses: null,
      mining: null,
      turbomining: null,
      turbominting: null,
      funding: null,
      config: {
        miningRecoveryMode: false
      },
      steps: {
        current: 1,
        completed: []
      }
    };
  }

  /**
   * Save the entire app state
   */
  static saveAll(state) {
    try {
      localStorage.setItem(ROOT_KEY, JSON.stringify(state));
    } catch (error) {
    }
  }

  /**
   * Get a specific section
   */
  static get(section) {
    const state = this.getAll();
    return state[section] || null;
  }

  /**
   * Save a specific section
   */
  static set(section, data) {
    const state = this.getAll();
    state[section] = data;
    this.saveAll(state);
  }

  /**
   * Clear a specific section
   */
  static clear(section) {
    const state = this.getAll();
    if (section === 'turbomining') {
      state.turbomining = null;
    } else if (section === 'mining') {
      state.mining = null;
    } else if (section === 'wallet') {
      state.wallet = null;
    } else if (section === 'turbominting') {
      state.turbominting = null;
    } else if (section === 'funding') {
      state.funding = null;
    } else {
      state[section] = null;
    }
    this.saveAll(state);
  }

  /**
   * Clear ALL app data
   */
  static clearAll() {
    localStorage.removeItem(ROOT_KEY);
    
    // Clear ALL legacy/duplicate keys
    const legacyKeys = [
      // Old turbomining keys
      'turbomining_data',
      'turbomining_selection',
      'turbomining_selection_draft',
      
      // Old wallet keys
      'bro_wallet_data',
      'wallet_extended_addresses', // Now inside bro_app
      
      // Old mining keys
      'miningProgress',
      'miningResult',
      
      // Old transaction/broadcast keys
      'bro_transaction_data',
      'bro_broadcast_data',
      'bro_signed_transactions',
      
      // Old UTXO keys
      'bro_utxo_data',
      'bro_utxo_display_data',
      
      // Old step tracking
      'bro_current_step',
      'bro_completed_steps',
      
      // Old funding keys
      'funding_transaction',
      
      // Zustand store (duplicate)
      'bro-minting-store',
      
      // Other legacy keys
      'charmsWallet'
    ];
    
    legacyKeys.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Clean up duplicate/legacy keys (preserves bro_app)
   */
  static cleanupDuplicates() {
    
    const duplicateKeys = [
      // Old turbomining keys (duplicates of bro_app.turbomining)
      'turbomining_data',
      'turbomining_selection',
      
      // Old wallet keys (duplicates of bro_app.wallet)
      'bro_wallet_data',
      
      // Old mining keys (duplicates of bro_app.mining)
      'miningProgress',
      'miningResult',
      
      // Old UTXO keys (duplicates of bro_app.batch)
      'bro_utxo_data',
      'bro_utxo_display_data',
      
      // Zustand store (complete duplicate)
      'bro-minting-store',
      
      // Other legacy keys
      'charmsWallet'
    ];
    
    let cleaned = 0;
    duplicateKeys.forEach(key => {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        cleaned++;
      }
    });
    
    return cleaned;
  }

  /**
   * Convenience methods for common operations
   */
  
  // Steps
  static getCurrentStep() {
    const state = this.getAll();
    return state.steps?.current || 1;
  }
  
  static saveCurrentStep(stepNumber) {
    const state = this.getAll();
    if (!state.steps) state.steps = { current: 1, completed: [] };
    state.steps.current = stepNumber;
    this.saveAll(state);
  }
  
  static getCompletedSteps() {
    const state = this.getAll();
    return state.steps?.completed || [];
  }
  
  static saveCompletedSteps(completed) {
    const state = this.getAll();
    if (!state.steps) state.steps = { current: 1, completed: [] };
    state.steps.completed = completed;
    this.saveAll(state);
  }
  
  // Wallet
  static getWallet() {
    return this.get('wallet');
  }
  
  static saveWallet(walletData) {
    this.set('wallet', {
      ...walletData,
      timestamp: Date.now()
    });
  }
  
  // Mining
  static getMining() {
    return this.get('mining');
  }
  
  static saveMining(miningData) {
    this.set('mining', {
      ...miningData,
      timestamp: Date.now()
    });
  }
  
  // Turbomining
  static getTurbomining() {
    return this.get('turbomining');
  }
  
  static saveTurbomining(turbominingData) {
    this.set('turbomining', {
      ...turbominingData,
      timestamp: Date.now()
    });
  }
  
  // Funding
  static getFunding() {
    return this.get('funding');
  }
  
  static saveFunding(fundingData) {
    this.set('funding', {
      ...fundingData,
      timestamp: Date.now()
    });
  }

  // Turbominting
  static getTurbominting() {
    return this.get('turbominting');
  }
  
  static saveTurbominting(turbomintingData) {
    this.set('turbominting', {
      ...turbomintingData,
      timestamp: Date.now()
    });
  }

  // Wallet Extended Addresses
  static getWalletExtendedAddresses() {
    return this.get('walletExtendedAddresses');
  }
  
  static saveWalletExtendedAddresses(addressesData) {
    this.set('walletExtendedAddresses', addressesData);
  }

  // Config
  static getConfig() {
    const state = this.getAll();
    return state.config || { miningRecoveryMode: false };
  }
  
  static setMiningRecoveryMode(enabled) {
    const state = this.getAll();
    if (!state.config) state.config = { miningRecoveryMode: false };
    state.config.miningRecoveryMode = enabled;
    this.saveAll(state);
  }
  
  static isMiningRecoveryMode() {
    const config = this.getConfig();
    return config.miningRecoveryMode === true;
  }

  static debug() {
    return this.getAll();
  }
}

export default CentralStorage;
