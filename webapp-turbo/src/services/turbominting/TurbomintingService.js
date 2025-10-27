/**
 * TurbomintingService - Business logic for turbominting operations
 * Handles all write operations to storage
 * Components should call these methods instead of writing to storage directly
 */

import { broadcastTx } from '../bitcoin/broadcastTx.js';
import CentralStorage from '../../storage/CentralStorage.js';

export class TurbomintingService {
  // ============================================
  // V2 METHODS - New Flow (Compatibility Layer)
  // ============================================

  /**
   * Load data with V2 structure (compatible with old data)
   */
  static loadV2() {
    const oldData = this.load();
    if (!oldData) return null;
    
    // Return data as-is, it's already compatible
    return oldData;
  }

  /**
   * Check if Step 1 (Mining TX) is complete
   */
  static isStep1Complete() {
    const data = this.load();
    return data?.miningTxConfirmed === true;
  }

  /**
   * Check if Step 2 (Funding Analysis) is complete
   */
  static isStep2Complete() {
    const data = this.load();
    return data?.fundingAnalysis?.completed === true;
  }

  /**
   * Check if Step 3 (Funding TX) is complete
   */
  static isStep3Complete() {
    const data = this.load();
    const needsFunding = data?.fundingAnalysis?.strategy === 'reorganize';
    
    if (!needsFunding) return true; // Skip if not needed
    return data?.fundingBroadcasted === true;
  }

  /**
   * Check if Step 4 (Minting Loop) is ready
   */
  static isStep4Ready() {
    return this.isStep1Complete() && 
           this.isStep2Complete() && 
           this.isStep3Complete();
  }

  /**
   * Complete Step 1 - Mining TX confirmed
   */
  static completeStep1(confirmationData) {
    this.update({
      miningTxConfirmed: true,
      miningReady: true,
      confirmationInfo: confirmationData
    });
  }

  /**
   * Complete Step 2 - Funding Analysis done
   */
  static completeStep2(analysisResult) {
    this.update({
      fundingAnalysis: {
        ...analysisResult,
        completed: true,
        timestamp: Date.now()
      }
    });
    
    // Auto-complete Step 3 if no funding needed
    if (analysisResult.strategy === 'sufficient_utxos') {
      this.update({ fundingReady: true });
    }
  }

  /**
   * Complete Step 3 - Funding TX broadcast
   */
  static completeStep3(fundingTxid) {
    this.update({
      fundingTxid,
      fundingBroadcasted: true,
      fundingReady: true
    });
  }

  /**
   * Reset from Step 2 (for re-analysis when adding funds)
   */
  static resetFromStep2() {
    const current = this.load();
    this.save({
      ...current,
      fundingAnalysis: null,
      fundingTxid: null,
      fundingBroadcasted: false,
      fundingReady: false,
      mintingProgress: null
    });
  }
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
      console.log('🔄 [MINT MORE] Starting reset...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // STEP 1: Get current state and list all keys
      const currentData = CentralStorage.getAll() || {};
      const allKeys = Object.keys(currentData);
      console.log('📦 Current localStorage keys:', allKeys);
      
      // STEP 2: Save ONLY wallet data in memory
      const wallet = currentData.wallet || null;
      const walletExtendedAddresses = currentData.walletExtendedAddresses || null;
      
      console.log('\n💾 PRESERVING (in memory):');
      console.log('  • wallet:', wallet ? '✅ Found' : '❌ Missing');
      if (wallet) {
        console.log('    - address:', wallet.address?.substring(0, 20) + '...');
      }
      console.log('  • walletExtendedAddresses:', walletExtendedAddresses ? '✅ Found' : '❌ Missing');
      
      // STEP 3: NUCLEAR OPTION - Clear EVERYTHING from localStorage
      console.log('\n🗑️  CLEARING ALL DATA (nuclear option):');
      allKeys.forEach(key => {
        console.log(`  • ${key}: DELETED`);
      });
      
      // Clear by creating empty object (removes ALL keys)
      CentralStorage.saveAll({});
      console.log('\n💥 localStorage COMPLETELY CLEARED');
      
      // STEP 4: Restore ONLY wallet data
      console.log('\n♻️  RESTORING wallet data:');
      const restoredState = {
        wallet,
        walletExtendedAddresses
      };
      
      CentralStorage.saveAll(restoredState);
      console.log('  • wallet: ✅ RESTORED');
      console.log('  • walletExtendedAddresses: ✅ RESTORED');
      
      // STEP 5: Verify cleanup
      const finalState = CentralStorage.getAll();
      const finalKeys = Object.keys(finalState);
      console.log('\n🔍 VERIFICATION - Final keys:', finalKeys);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ [MINT MORE] Reset complete - 100% clean slate');
      
      return true;
    } catch (error) {
      console.error('❌ [MINT MORE] Reset failed:', error);
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
        // Save to turbominting storage
        const current = CentralStorage.getTurbominting() || {};
        CentralStorage.saveTurbominting({
          ...current,
          miningTxid: result.txid,
          explorerUrl: result.explorerUrl,
          miningTxConfirmed: false,
          miningReady: false,
          timestamp: Date.now()
        });
        
        // CRITICAL: Also save to turbomining storage to maintain lock state AND transaction hex
        const turbominingData = CentralStorage.getTurbomining() || {};
        CentralStorage.saveTurbomining({
          ...turbominingData,
          miningTxid: result.txid,
          signedTxHex: signedTxHex,
          explorerUrl: result.explorerUrl,
          locked: true,
          step1Locked: true,
          step2Locked: true,
          status: 'broadcast',
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
        
        // Map funding TX outputs to resultingUtxos with correct vout
        const resultingUtxosWithTxid = analysis.resultingUtxos?.map((utxo, index) => ({
          txid: result.txid,
          vout: index,  // Each output gets sequential vout (0, 1, 2, ...)
          value: utxo.value,
          source: 'funding_tx'
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
   * Initialize minting progress with pre-calculated funding UTXOs
   * @param {number} totalOutputs - Total number of outputs to mint
   * @param {Array} resultingUtxos - Funding UTXOs (from funding analysis)
   * @param {boolean} force - Force re-initialization even if progress exists
   * @returns {boolean}
   */
  static initializeMintingProgress(totalOutputs, resultingUtxos = [], force = false) {
    try {
      console.log('🔧 [TurbomintingService] initializeMintingProgress called');
      console.log('  • totalOutputs:', totalOutputs);
      console.log('  • resultingUtxos:', resultingUtxos);
      console.log('  • force:', force);
      
      const current = CentralStorage.getTurbominting() || {};
      
      // Don't overwrite if minting already started (unless forced)
      if (!force && current.mintingProgress?.outputs?.some(o => o.status !== 'ready')) {
        console.log('⏭️  [TurbomintingService] Skipping - minting already started (not forced)');
        return false;
      }
      
      const outputs = Array.from({ length: totalOutputs }, (_, index) => {
        const fundingUtxo = resultingUtxos[index] ? {
          txid: resultingUtxos[index].txid,
          vout: resultingUtxos[index].vout,
          value: resultingUtxos[index].value
        } : null;
        
        return {
          index,
          status: 'ready',
          currentSubStep: null,
          fundingUtxo,
          commitTxid: null,
          spellTxid: null,
          error: null,
          createdAt: Date.now()
        };
      });

      console.log('📦 [TurbomintingService] Created outputs array:');
      outputs.forEach((output, i) => {
        console.log(`  Output ${i}:`, {
          index: output.index,
          status: output.status,
          fundingUtxo: output.fundingUtxo ? `${output.fundingUtxo.txid.substring(0, 8)}...:${output.fundingUtxo.vout} (${output.fundingUtxo.value} sats)` : '❌ NULL'
        });
      });

      CentralStorage.saveTurbominting({
        ...current,
        mintingProgress: {
          completed: 0,
          total: totalOutputs,
          outputs
        },
        timestamp: Date.now()
      });
      
      console.log('✅ [TurbomintingService] Minting progress saved to localStorage');
      return true;
    } catch (error) {
      console.error('❌ [TurbomintingService] Error initializing minting progress:', error);
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

  /**
   * Check if minting loop is complete (all outputs processed)
   * @returns {boolean}
   */
  static isMintingLoopComplete() {
    try {
      const current = CentralStorage.getTurbominting() || {};
      const progress = current?.mintingProgress;
      
      if (!progress || !progress.total) {
        return false;
      }
      
      // Loop is complete when completed count equals total
      return progress.completed === progress.total && progress.total > 0;
    } catch (error) {
      return false;
    }
  }

  // ============================================
  // MONITORING OPERATIONS
  // ============================================
  // Note: Monitoring is now handled by useConfirmationMonitor hook in components

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
