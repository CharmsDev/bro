/**
 * TurbomintingService - Business logic for turbominting operations
 * Handles all write operations to storage
 * Components should call these methods instead of writing to storage directly
 */

import { broadcastTx } from '../bitcoin/broadcastTx.js';
import { ConfirmationMonitor } from '../bitcoin/confirmation-monitor.js';
import CentralStorage from '../../storage/CentralStorage.js';

export class TurbomintingService {
  // ============================================
  // RESET / CLEANUP OPERATIONS
  // ============================================

  /**
   * Reset turbominting data for "Mint More" functionality
   * Clears ALL turbominting data while preserving wallet
   * 
   * WHAT IS CLEARED:
   * - bro_app.turbomining (mining transaction data)
   * - bro_app.turbominting (funding, minting progress, outputs)
   * - bro_app.batch (UTXO selection data)
   * 
   * WHAT IS PRESERVED:
   * - bro_app.wallet (wallet data, seed phrase, keys)
   * - bro_app.walletExtendedAddresses (extended addresses)
   * 
   * @returns {boolean} Success status
   */
  static resetForMintMore() {
    try {
      const currentData = CentralStorage.get() || {};
      
      const preservedData = {
        wallet: currentData.wallet || null,
        walletExtendedAddresses: currentData.walletExtendedAddresses || null
      };
      
      CentralStorage.saveAll(preservedData);
      
      return true;
    } catch (error) {
      return false;
    }
  }
  // ============================================
  // MINING TRANSACTION OPERATIONS
  // ============================================

  /**
   * Broadcast mining transaction
   * @param {string} signedTxHex - Signed transaction hex
   * @returns {Promise<{success: boolean, txid?: string, explorerUrl?: string, error?: string}>}
   */
  static async broadcastMiningTransaction(signedTxHex) {
    try {
      const result = await broadcastTx(signedTxHex);
      
      if (result.success && result.txid) {
        // Save to storage
        const current = CentralStorage.getTurbominting() || {};
        CentralStorage.saveTurbominting({
          ...current,
          miningTxid: result.txid,
          explorerUrl: result.explorerUrl,
          miningTxConfirmed: false,
          miningReady: false,
          timestamp: Date.now()
        });
        
        return {
          success: true,
          txid: result.txid,
          explorerUrl: result.explorerUrl
        };
      }
      
      return {
        success: false,
        error: result.error || 'Broadcast failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set mining transaction as confirmed
   * @param {object} confirmationInfo - Confirmation details
   * @returns {boolean}
   */
  static setMiningConfirmed(confirmationInfo) {
    try {
      const current = CentralStorage.getTurbominting() || {};
      CentralStorage.saveTurbominting({
        ...current,
        miningTxConfirmed: true,
        confirmationInfo,
        miningReady: true,
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set mining ready flag
   * @param {boolean} ready - Ready state
   * @returns {boolean}
   */
  static setMiningReady(ready = true) {
    try {
      const current = CentralStorage.getTurbominting() || {};
      CentralStorage.saveTurbominting({
        ...current,
        miningReady: ready,
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // ============================================
  // FUNDING TRANSACTION OPERATIONS
  // ============================================

  /**
   * Broadcast funding transaction
   * @param {string} signedHex - Signed transaction hex
   * @param {object} transaction - Full transaction object
   * @param {object} analysis - Funding analysis data
   * @returns {Promise<{success: boolean, txid?: string, explorerUrl?: string, error?: string}>}
   */
  static async broadcastFundingTransaction(signedHex, transaction, analysis) {
    try {
      const result = await broadcastTx(signedHex);
      
      if (result.success && result.txid) {
        const transactionWithTxid = {
          ...transaction,
          txid: result.txid
        };
        
        const resultingUtxosWithTxid = analysis.resultingUtxos?.map((utxo, index) => ({
          ...utxo,
          txid: result.txid,
          vout: utxo.vout !== undefined ? utxo.vout : index
        })) || [];
        
        const current = CentralStorage.getTurbominting() || {};
        const dataToSave = {
          ...current,
          fundingTxid: result.txid,
          fundingExplorerUrl: result.explorerUrl,
          fundingTxConfirmed: false,
          fundingReady: true,
          fundingBroadcasted: true,
          fundingTransaction: transactionWithTxid,
          fundingAnalysis: {
            ...analysis,
            resultingUtxos: resultingUtxosWithTxid
          },
          timestamp: Date.now()
        };
        
        CentralStorage.saveTurbominting(dataToSave);
        
        return {
          success: true,
          txid: result.txid,
          explorerUrl: result.explorerUrl
        };
      }
      
      return {
        success: false,
        error: result.error || 'Broadcast failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set funding transaction as confirmed
   * @param {object} confirmationInfo - Confirmation details
   * @returns {boolean}
   */
  static setFundingConfirmed(confirmationInfo) {
    try {
      const current = CentralStorage.getTurbominting() || {};
      CentralStorage.saveTurbominting({
        ...current,
        fundingTxConfirmed: true,
        fundingConfirmationInfo: confirmationInfo,
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set funding ready flag
   * @param {boolean} ready - Ready state
   * @returns {boolean}
   */
  static setFundingReady(ready = true) {
    try {
      const current = CentralStorage.getTurbominting() || {};
      CentralStorage.saveTurbominting({
        ...current,
        fundingReady: ready,
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // ============================================
  // MINTING LOOP OPERATIONS
  // ============================================

  /**
   * Initialize minting progress
   * @param {number} totalOutputs - Total number of outputs to mint
   * @returns {boolean}
   */
  static initializeMintingProgress(totalOutputs) {
    try {
      const outputs = Array.from({ length: totalOutputs }, (_, i) => ({
        index: i,
        status: 'ready', // Changed from 'pending' to 'ready' - outputs are ready to mint when funding is ready
        currentSubStep: null,
        miningUtxo: null,
        fundingUtxo: null,
        commitTxid: null,
        spellTxid: null,
        error: null,
        createdAt: Date.now()
      }));

      const current = CentralStorage.getTurbominting() || {};
      CentralStorage.saveTurbominting({
        ...current,
        mintingProgress: {
          completed: 0,
          total: totalOutputs,
          outputs
        },
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update minting progress for a specific output
   * @param {number} outputIndex - Index of the output
   * @param {string} status - New status
   * @param {object} data - Additional data to merge
   * @returns {boolean}
   */
  static updateMintingProgress(outputIndex, status, data = {}) {
    try {
      const current = CentralStorage.getTurbominting() || {};
      const progress = current?.mintingProgress || { completed: 0, total: 0, outputs: [] };
      const outputs = [...progress.outputs];
      
      // Update specific output
      outputs[outputIndex] = {
        ...outputs[outputIndex],
        status,
        ...data,
        updatedAt: Date.now()
      };
      
      // Calculate completed count
      const completed = outputs.filter(o => o.status === 'completed').length;

      CentralStorage.saveTurbominting({
        ...current,
        mintingProgress: {
          completed,
          total: progress.total,
          outputs
        },
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // ============================================
  // MONITORING OPERATIONS
  // ============================================

  /**
   * Start monitoring mining transaction confirmation
   * @param {string} txid - Transaction ID
   * @param {function} onConfirmation - Callback when confirmed
   * @param {function} onError - Callback on error
   * @returns {ConfirmationMonitor}
   */
  static monitorMiningConfirmation(txid, onConfirmation, onError) {
    const monitor = new ConfirmationMonitor(txid, {
      onConfirmation: (info) => {
        // Save confirmation to storage
        this.setMiningConfirmed(info);
        // Call user callback
        if (onConfirmation) onConfirmation(info);
      },
      onError: (error) => {
        if (onError) onError(error);
      }
    });
    
    monitor.start();
    return monitor;
  }

  /**
   * Start monitoring funding transaction confirmation
   * @param {string} txid - Transaction ID
   * @param {function} onConfirmation - Callback when confirmed
   * @param {function} onError - Callback on error
   * @returns {Promise<object>}
   */
  static async monitorFundingConfirmation(txid, onConfirmation, onError) {
    try {
      const monitor = new ConfirmationMonitor();
      const result = await monitor.waitForConfirmation(txid, 1, 10000);
      
      // Save confirmation to storage
      this.setFundingConfirmed(result);
      
      // Call user callback
      if (onConfirmation) onConfirmation(result);
      
      return result;
    } catch (error) {
      if (onError) onError(error);
      throw error;
    }
  }

  // ============================================
  // READ OPERATIONS (for convenience)
  // ============================================

  /**
   * Load turbominting data
   * @returns {object|null}
   */
  static load() {
    return CentralStorage.getTurbominting();
  }

  /**
   * Check if funding was broadcasted
   * @returns {boolean}
   */
  static isFundingBroadcasted() {
    const data = this.load();
    return data?.fundingBroadcasted === true;
  }

  /**
   * Get funding transaction
   * @returns {object|null}
   */
  static getFundingTransaction() {
    const data = this.load();
    return data?.fundingTransaction || null;
  }

  /**
   * Get funding analysis
   * @returns {object|null}
   */
  static getFundingAnalysis() {
    const data = this.load();
    return data?.fundingAnalysis || null;
  }

  /**
   * Check if minting is ready
   * @returns {boolean}
   */
  static isMintingReady() {
    const data = this.load();
    return data?.miningReady === true && data?.fundingReady === true;
  }
}

export default TurbomintingService;
