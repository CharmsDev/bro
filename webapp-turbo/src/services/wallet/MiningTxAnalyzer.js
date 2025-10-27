/**
 * MiningTxAnalyzer - Analyze wallet transactions to find mining TXs
 */
import BitcoinApiRouter from '../providers/bitcoin-api-router/index.js';
import { reward, leadingZeros } from '../mining/RewardCalculator.js';

const MINING_OUTPUT_VALUE = 333; // Mining outputs are always 333 sats (same as WalletUtxoScanner)

export class MiningTxAnalyzer {
  constructor() {
    // Reuse existing BitcoinApiRouter instead of creating new instances
    this.apiRouter = new BitcoinApiRouter();
  }
  /**
   * Scan wallet address for mining transactions
   * @param {string} address - Bitcoin address to scan
   * @returns {Promise<Array>} Array of mining TX analysis objects
   */
  async scanWalletForMiningTxs(address) {
    try {
      // Reuse existing apiRouter instance
      const addressInfo = await this.apiRouter.getAddressInfo(address, { 
        page: 1, 
        size: 1000, 
        fromHeight: 0, 
        details: 'txids' 
      });
      
      // Extract txids from the response
      let txids = [];
      if (addressInfo?.txids) {
        txids = addressInfo.txids;
      } else if (Array.isArray(addressInfo)) {
        txids = addressInfo;
      }
      
      if (!txids || txids.length === 0) {
        return [];
      }
      
      // Filter and analyze mining transactions
      const miningTxs = [];
      
      for (const txid of txids) {
        const analysis = await this.analyzeMiningTx(txid, address);
        
        if (analysis && analysis.isMiningTx) {
          miningTxs.push(analysis);
        }
      }
      
      // Sort by most recent first
      miningTxs.sort((a, b) => (b.blockHeight || 0) - (a.blockHeight || 0));
      
      return miningTxs;
    } catch (error) {
      console.error('[MiningTxAnalyzer] Error scanning wallet:', error);
      throw error;
    }
  }
  
  /**
   * Analyze a single transaction to determine if it's a mining TX
   * @param {string} txid - Transaction ID
   * @param {string} address - Wallet address to check ownership
   * @returns {Promise<Object|null>} Analysis object or null if not a mining TX
   */
  async analyzeMiningTx(txid, address) {
    try {
      // Reuse existing apiRouter instance
      const tx = await this.apiRouter.getRawTransaction(txid, true);
      
      if (!tx || !tx.vout || tx.vout.length < 2) {
        return null;
      }
      
      // Check if vout[0] is OP_RETURN
      const firstOutput = tx.vout[0];
      const isOpReturn = firstOutput.scriptPubKey?.type === 'nulldata' || 
                        firstOutput.scriptPubKey?.asm?.startsWith('OP_RETURN');
      
      if (!isOpReturn) {
        return null;
      }
      
      // Find all 333 sat outputs
      const miningOutputs = [];
      let changeOutput = null;
      
      for (let i = 1; i < tx.vout.length; i++) {
        const output = tx.vout[i];
        // Value comes in BTC from getRawTransaction, convert to sats
        const value = output.value ? Math.round(output.value * 100000000) : 0;
        
        // Check if this output belongs to our address
        const addresses = output.scriptPubKey?.addresses || (output.scriptPubKey?.address ? [output.scriptPubKey.address] : []);
        const isOurs = addresses.includes(address);
        
        if (!isOurs) {
          continue; // Skip outputs not belonging to our wallet
        }
        
        if (value === MINING_OUTPUT_VALUE) {
          miningOutputs.push({
            vout: i,
            value: value,
            address: addresses[0] || address
          });
        } else {
          // This is likely the change output
          changeOutput = {
            vout: i,
            value: value,
            address: addresses[0] || address
          };
        }
      }
      
      // Must have at least one mining output to be considered a mining TX
      if (miningOutputs.length === 0) {
        return null;
      }
      
      // Check which outputs are spent/unspent
      const outputsStatus = await this.checkOutputsStatus(txid, miningOutputs, address);
      
      const spentOutputs = outputsStatus.filter(o => o.spent).length;
      const unspentOutputs = outputsStatus.filter(o => !o.spent).length;
      
      // Calculate total inputs value (sum of all inputs)
      let totalInputValue = 0;
      if (tx.vin && Array.isArray(tx.vin)) {
        for (const input of tx.vin) {
          // Input value comes in BTC, convert to sats
          if (input.prevout && input.prevout.value !== undefined) {
            totalInputValue += Math.round(input.prevout.value * 100000000);
          }
        }
      }
      
      // Calculate total outputs value (sum of all outputs)
      let totalOutputValue = 0;
      if (tx.vout && Array.isArray(tx.vout)) {
        for (const output of tx.vout) {
          totalOutputValue += Math.round(output.value * 100000000);
        }
      }
      
      // Fee = inputs - outputs
      const fee = totalInputValue > 0 ? totalInputValue - totalOutputValue : null;
      
      // Amount spent = total inputs (what we had before)
      const amountSpent = totalInputValue > 0 ? totalInputValue : null;
      
      return {
        txid: txid,
        isMiningTx: true,
        blockHeight: tx.height || null,
        confirmations: tx.confirmations || 0,
        timestamp: tx.blocktime || tx.time || null,
        totalOutputs: miningOutputs.length,
        spentOutputs: spentOutputs,
        unspentOutputs: unspentOutputs,
        miningOutputs: outputsStatus,
        changeOutput: changeOutput,
        canContinueMinting: unspentOutputs > 0,
        // Financial details
        amountSpent: amountSpent,
        fee: fee,
        totalInputValue: totalInputValue,
        totalOutputValue: totalOutputValue
      };
    } catch (error) {
      console.error(`[MiningTxAnalyzer] Error analyzing TX ${txid}:`, error);
      return null;
    }
  }
  
  /**
   * Check if outputs are spent or unspent
   * @param {string} txid - Transaction ID
   * @param {Array} outputs - Array of output objects
   * @param {string} address - Wallet address
   * @returns {Promise<Array>} Array of outputs with spent status
   */
  async checkOutputsStatus(txid, outputs, address) {
    try {
      // Reuse existing apiRouter instance
      const utxos = await this.apiRouter.getAddressUtxos(address, { confirmed: false });
      
      // Create a Set of unspent outputs for quick lookup
      const unspentSet = new Set(
        utxos.map(utxo => `${utxo.txid}:${utxo.vout}`)
      );
      
      // Check each output
      return outputs.map(output => ({
        ...output,
        spent: !unspentSet.has(`${txid}:${output.vout}`)
      }));
    } catch (error) {
      console.error('[MiningTxAnalyzer] Error checking outputs status:', error);
      // If we can't check, assume all are unspent (safer)
      return outputs.map(output => ({
        ...output,
        spent: false
      }));
    }
  }
  
  /**
   * Get mining TX data formatted for turbominting recovery
   * @param {string} txid - Mining transaction ID
   * @param {string} address - Wallet address
   * @returns {Promise<Object|null>} Formatted data for recovery or null
   */
  async getMiningTxForRecovery(txid, address) {
    try {
      const analysis = await this.analyzeMiningTx(txid, address);
      
      if (!analysis || !analysis.isMiningTx) {
        return null;
      }
      
      // Reuse existing apiRouter instance
      const rawTx = await this.apiRouter.getRawTransaction(txid, false);
      
      if (!rawTx) {
        throw new Error('Failed to fetch raw transaction');
      }
      
      // Get only unspent outputs for recovery
      const unspentOutputs = analysis.miningOutputs
        .filter(o => !o.spent)
        .map(o => ({
          outputIndex: o.vout,
          value: o.value
        }));
      
      // Extract OP_RETURN data and calculate reward
      const opReturnData = await this.extractOpReturnData(txid);
      
      return {
        signedTxHex: rawTx,
        miningTxid: txid,
        spendableOutputs: unspentOutputs,
        numberOfOutputs: unspentOutputs.length,
        miningData: {
          reward: opReturnData?.reward || null,
          nonce: opReturnData?.nonce || null,
          hash: opReturnData?.hash || null,
          leadingZeros: opReturnData?.leadingZeros || null
        },
        challengeTxid: opReturnData?.challengeTxid || '',
        challengeVout: opReturnData?.challengeVout ?? 0,
        changeAmount: analysis.changeOutput?.value || 0,
        miningTxConfirmed: analysis.confirmations >= 1,
        miningReady: true,
        miningBroadcasted: true,
        confirmationInfo: {
          blockHeight: analysis.blockHeight || 0,
          confirmations: analysis.confirmations,
          timestamp: analysis.timestamp || Date.now()
        },
        timestamp: analysis.timestamp || Date.now()
      };
    } catch (error) {
      console.error('[MiningTxAnalyzer] Error getting mining TX for recovery:', error);
      throw error;
    }
  }
  
  /**
   * Compute double SHA256 hash
   * @param {string} input - Input string to hash
   * @returns {Promise<string>} Hex string of the hash
   */
  async computeDoubleSha256(input) {
    try {
      // Convert string to Uint8Array
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      
      // First SHA256
      const hash1 = await crypto.subtle.digest('SHA-256', data);
      
      // Second SHA256
      const hash2 = await crypto.subtle.digest('SHA-256', hash1);
      
      // Convert to hex string
      const hashArray = Array.from(new Uint8Array(hash2));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (error) {
      console.error('[MiningTxAnalyzer] Error computing double SHA256:', error);
      return null;
    }
  }
  
  /**
   * Extract OP_RETURN data from mining transaction and calculate reward
   * @param {string} txid - Mining transaction ID
   * @returns {Promise<Object|null>} OP_RETURN data with reward calculation
   */
  async extractOpReturnData(txid) {
    try {
      const tx = await this.apiRouter.getRawTransaction(txid, true);
      
      if (!tx || !tx.vout || tx.vout.length === 0) {
        console.warn('[MiningTxAnalyzer] No vout in transaction');
        return null;
      }
      
      // First output should be OP_RETURN
      const opReturnOutput = tx.vout[0];
      if (!opReturnOutput.scriptPubKey || 
          (opReturnOutput.scriptPubKey.type !== 'nulldata' && 
           !opReturnOutput.scriptPubKey.asm?.startsWith('OP_RETURN'))) {
        console.warn('[MiningTxAnalyzer] First output is not OP_RETURN');
        return null;
      }
      
      // Extract hex data from OP_RETURN
      // Format: OP_RETURN <hex_data>
      const asm = opReturnOutput.scriptPubKey.asm;
      console.log('[MiningTxAnalyzer] OP_RETURN asm:', asm);
      console.log('[MiningTxAnalyzer] Full scriptPubKey:', JSON.stringify(opReturnOutput.scriptPubKey, null, 2));
      
      const hexMatch = asm.match(/OP_RETURN\s+([0-9a-fA-F]+)/);
      
      if (!hexMatch || !hexMatch[1]) {
        console.warn('[MiningTxAnalyzer] Could not extract hex data from OP_RETURN');
        console.warn('[MiningTxAnalyzer] ASM was:', asm);
        return null;
      }
      
      const hexData = hexMatch[1];
      console.log('[MiningTxAnalyzer] Extracted hex data:', hexData);
      console.log('[MiningTxAnalyzer] Hex data length:', hexData.length, 'chars');
      
      // BRO mining TX format: OP_RETURN contains nonce as ASCII decimal string
      // Example: "1550217389" → hex: 31353530323137333839
      // The nonce is stored as ASCII text, not binary
      
      // Convert hex to ASCII string to get the nonce
      let nonceStr = '';
      for (let i = 0; i < hexData.length; i += 2) {
        const byte = parseInt(hexData.substr(i, 2), 16);
        nonceStr += String.fromCharCode(byte);
      }
      
      console.log('[MiningTxAnalyzer] Decoded nonce string:', nonceStr);
      
      // Parse nonce as decimal number
      const nonce = parseInt(nonceStr, 10);
      
      if (isNaN(nonce)) {
        console.warn('[MiningTxAnalyzer] ⚠️ Could not parse nonce from:', nonceStr);
        return null;
      }
      
      // Extract challenge UTXO from input[0] of the mining TX
      // The challenge is the UTXO being spent by the mining transaction
      let challengeTxid = null;
      let challengeVout = null;
      
      if (tx.vin && tx.vin.length > 0 && tx.vin[0].txid && tx.vin[0].vout !== undefined) {
        challengeTxid = tx.vin[0].txid;
        challengeVout = tx.vin[0].vout;
        console.log('[MiningTxAnalyzer] Challenge UTXO:', `${challengeTxid}:${challengeVout}`);
      } else {
        console.warn('[MiningTxAnalyzer] Could not extract challenge UTXO from input[0]');
        return {
          nonce,
          hash: null,
          leadingZeros: null,
          reward: null,
          blockTime: tx.blocktime || tx.time || Math.floor(Date.now() / 1000),
          challengeTxid: null,
          challengeVout: null
        };
      }
      
      // Compute hash: sha256(sha256(challengeTxid:challengeVout + nonce))
      // Format: "txid:vout" + "nonce" (as string)
      const challengeString = `${challengeTxid}:${challengeVout}${nonce}`;
      console.log('[MiningTxAnalyzer] Hash input:', challengeString);
      
      // We need to compute double SHA256
      // For now, we'll use the crypto API
      const hash = await this.computeDoubleSha256(challengeString);
      console.log('[MiningTxAnalyzer] Computed hash:', hash);
      
      // Get block timestamp
      const blockTime = tx.blocktime || tx.time || Math.floor(Date.now() / 1000);
      
      // Calculate reward using RewardCalculator
      const leadingZerosCount = leadingZeros(hash);
      const rewardAmount = reward(nonce, hash, blockTime);
      
      console.log('[MiningTxAnalyzer] Extracted OP_RETURN data:', {
        nonce,
        hash,
        leadingZeros: leadingZerosCount,
        reward: Number(rewardAmount),
        blockTime,
        challengeTxid,
        challengeVout
      });
      
      return {
        nonce,
        hash,
        leadingZeros: leadingZerosCount,
        reward: Number(rewardAmount),
        blockTime,
        challengeTxid,
        challengeVout
      };
    } catch (error) {
      console.error('[MiningTxAnalyzer] Error extracting OP_RETURN data:', error);
      return null;
    }
  }
}

export default MiningTxAnalyzer;
