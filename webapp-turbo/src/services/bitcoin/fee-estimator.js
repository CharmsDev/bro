/**
 * FeeEstimator - Dynamic Bitcoin transaction fee estimation
 * Uses BitcoinApiRouter for QuickNode + Mempool.space fallback
 */

import BitcoinApiRouter from '../providers/bitcoin-api-router/index.js';

export class FeeEstimator {
  constructor() {
    this.apiRouter = new BitcoinApiRouter();
    this.cachedFeeRate = null;
    this.cacheTimestamp = null;
    this.cacheValidityMs = 60000; // 1 minute cache
  }

  /**
   * Get current network fee rate in sat/vB
   * @param {number} blocks - Target confirmation blocks (1=fastest, 3=medium, 6=slow)
   * @returns {Promise<number>} Fee rate in sat/vB
   */
  async getFeeRate(blocks = 3) {
    try {
      // Return cached value if still valid
      if (this.cachedFeeRate && this.cacheTimestamp) {
        const age = Date.now() - this.cacheTimestamp;
        if (age < this.cacheValidityMs) {
          return this.cachedFeeRate;
        }
      }

      // Fetch fresh fee rate
      const feeRate = await this.apiRouter.getAverageFeeRate(blocks, 'CONSERVATIVE', 2);
      
      // Cache the result
      this.cachedFeeRate = feeRate;
      this.cacheTimestamp = Date.now();
      
      return feeRate;
    } catch (error) {
      // Fallback to low default (suitable for testnet and low-traffic periods)
      const fallbackRate = 2; // 2 sat/vB default (testnet typical)
      return fallbackRate;
    }
  }

  /**
   * Estimate transaction size in vbytes
   * @param {number} numInputs - Number of inputs
   * @param {number} numOutputs - Number of outputs
   * @param {boolean} hasTaproot - Whether transaction uses Taproot (P2TR)
   * @returns {number} Estimated size in vbytes
   */
  estimateTxSize(numInputs, numOutputs, hasTaproot = true) {
    // Base transaction overhead
    let size = 10.5; // version (4) + locktime (4) + input count (1) + output count (1) + marker/flag (0.5)
    
    if (hasTaproot) {
      // Taproot (P2TR) input: ~57.5 vbytes each
      // - Previous outpoint: 36 bytes
      // - Script sig: 1 byte (empty)
      // - Sequence: 4 bytes
      // - Witness: ~16.5 vbytes (1 signature of 64 bytes)
      size += numInputs * 57.5;
      
      // Taproot (P2TR) output: 43 bytes each
      // - Value: 8 bytes
      // - Script length: 1 byte
      // - Script: 34 bytes (OP_1 + 32-byte pubkey)
      size += numOutputs * 43;
    } else {
      // Legacy/SegWit estimation (if needed)
      size += numInputs * 68;
      size += numOutputs * 31; // P2WPKH output is ~31 vbytes
    }
    
    return Math.ceil(size);
  }

  /**
   * Calculate total fee for a transaction
   * @param {number} numInputs - Number of inputs
   * @param {number} numOutputs - Number of outputs (including OP_RETURN)
   * @param {number} feeRate - Fee rate in sat/vB (optional, will fetch if not provided)
   * @returns {Promise<number>} Total fee in satoshis
   */
  async calculateFee(numInputs, numOutputs, feeRate = null) {
    try {
      // Get fee rate if not provided
      if (!feeRate) {
        feeRate = await this.getFeeRate(3); // Medium priority (3 blocks)
      }
      
      const txSize = this.estimateTxSize(numInputs, numOutputs, true);
      
      // Calculate fee
      const fee = Math.ceil(txSize * feeRate);
      
      return fee;
    } catch (error) {
      // Fallback to realistic estimate based on typical sizes
      // ~58 vbytes per input + ~43 vbytes per output + 10.5 overhead
      const estimatedSize = 10.5 + (numInputs * 58) + (numOutputs * 43);
      const fallbackFee = Math.ceil(estimatedSize * 2); // 2 sat/vB fallback
      return fallbackFee;
    }
  }

  /**
   */
  clearCache() {
    this.cachedFeeRate = null;
    this.cacheTimestamp = null;
  }
}

// Singleton instance
let feeEstimatorInstance = null;

export function getFeeEstimator() {
  if (!feeEstimatorInstance) {
    feeEstimatorInstance = new FeeEstimator();
  }
  return feeEstimatorInstance;
}
