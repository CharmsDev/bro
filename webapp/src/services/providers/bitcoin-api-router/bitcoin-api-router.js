import QuickNodeClient from '../quicknode/client.js';
import MempoolClient from '../mempool/client.js';
import { environmentConfig } from '../../../config/environment.js';

/**
 * BitcoinApiRouter - Unified Bitcoin API with QuickNode primary + Mempool.space fallback
 * Automatically tries QuickNode first, falls back to mempool.space if QuickNode fails
 */
export default class BitcoinApiRouter {
  constructor() {
    this.quicknode = new QuickNodeClient();
    this.mempool = new MempoolClient();
    this.network = environmentConfig.getNetwork();
  }

  /**
   * Execute method with QuickNode primary, mempool.space fallback
   */
  async _executeWithFallback(primaryMethod, fallbackMethod, methodName) {
    try {
      const result = await primaryMethod();
      return result;
    } catch (error) {
      console.warn(`[BitcoinApiRouter] QuickNode ${methodName} failed: ${error.message}`);
      
      try {
        const result = await fallbackMethod();
        return result;
      } catch (fallbackError) {
        console.error(`[BitcoinApiRouter] Both QuickNode and mempool.space failed for ${methodName}`);
        throw new Error(`${methodName} failed: QuickNode (${error.message}) | Mempool (${fallbackError.message})`);
      }
    }
  }

  // === BROADCAST METHODS ===

  async sendRawTransaction(hex) {
    return await this._executeWithFallback(
      () => this.quicknode.sendRawTransaction(hex),
      () => this.mempool.broadcastTransaction(hex),
      'sendRawTransaction'
    );
  }

  async submitPackage(hexes) {
    return await this._executeWithFallback(
      () => this.quicknode.submitPackage(hexes),
      async () => {
        // Mempool doesn't have package submission, broadcast individually
        const results = [];
        for (const hex of hexes) {
          const txid = await this.mempool.broadcastTransaction(hex);
          results.push(txid);
        }
        return results;
      },
      'submitPackage'
    );
  }

  // === TRANSACTION METHODS ===

  async getRawTransaction(txid, verbose = true) {
    return await this._executeWithFallback(
      () => this.quicknode.getRawTransaction(txid, verbose),
      async () => {
        if (!verbose) {
          return await this.mempool.getTransactionHex(txid);
        }

        // Get transaction data and normalize to QuickNode format
        const [tx, status, height] = await Promise.all([
          this.mempool.getTransaction(txid),
          this.mempool.getTransactionStatus(txid),
          this.mempool.getBlockHeight()
        ]);

        const confirmations = status.confirmed ? (height - status.block_height + 1) : 0;

        return {
          txid: tx.txid,
          hash: tx.txid,
          version: tx.version,
          size: tx.size,
          vsize: tx.vsize || tx.size,
          weight: tx.weight || tx.size * 4,
          locktime: tx.locktime,
          vin: tx.vin,
          vout: tx.vout.map(out => ({
            ...out,
            value: out.value / 100000000 // sats to BTC for QuickNode
          })),
          confirmations,
          blockhash: status.block_hash,
          blocktime: status.block_time,
          time: status.block_time,
          height: status.block_height,
          fee: tx.fee ? tx.fee / 100000000 : undefined
        };
      },
      'getRawTransaction'
    );
  }

  // === UTXO METHODS ===

  async getAddressUtxos(address, options = { confirmed: false }) {
    return await this._executeWithFallback(
      async () => {
        const res = await this.quicknode.getAddressUtxos(address, options);
        // QuickNode sometimes returns {result:null} with HTTP 200. Treat that as error to trigger fallback.
        if (res == null) {
          console.warn('[BitcoinApiRouter] QuickNode getAddressUtxos returned null result. Falling back...');
          throw new Error('QuickNode getAddressUtxos null result');
        }
        // If QuickNode ever returns a wrapped shape like { utxos: [...] }, unwrap it.
        const normalized = Array.isArray(res) ? res : (Array.isArray(res?.utxos) ? res.utxos : null);
        if (normalized == null) {
          console.warn('[BitcoinApiRouter] QuickNode getAddressUtxos returned unexpected shape:', typeof res);
          throw new Error('QuickNode getAddressUtxos unexpected shape');
        }
        // Return as-is (empty array is a valid no-UTXO case and should NOT trigger fallback)
        return normalized;
      },
      async () => {
        const [utxos, height] = await Promise.all([
          this.mempool.getAddressUtxos(address),
          this.mempool.getBlockHeight()
        ]);

        return utxos
          .filter(utxo => options.confirmed ? utxo.status.confirmed : true)
          .map(utxo => ({
            txid: utxo.txid,
            vout: utxo.vout,
            value: utxo.value, // Already in sats
            confirmations: utxo.status.confirmed ? (height - utxo.status.block_height + 1) : 0,
            height: utxo.status.block_height || null
          }));
      },
      'getAddressUtxos'
    );
  }

  async getAddressInfo(address, options = { page: 1, size: 1000, fromHeight: 0, details: 'txids' }) {
    return await this._executeWithFallback(
      () => this.quicknode.getAddressInfo(address, options),
      () => this.mempool.getAddressInfo(address),
      'getAddressInfo'
    );
  }

  // === BLOCK METHODS ===

  async getBlockCount() {
    return await this._executeWithFallback(
      () => this.quicknode.getBlockCount(),
      () => this.mempool.getBlockHeight(),
      'getBlockCount'
    );
  }

  async getBlockHash(height) {
    return await this._executeWithFallback(
      () => this.quicknode.getBlockHash(height),
      () => this.mempool.getBlockHash(height),
      'getBlockHash'
    );
  }

  async getBlockHeader(hash, verbose = true) {
    return await this._executeWithFallback(
      () => this.quicknode.getBlockHeader(hash, verbose),
      () => this.mempool.getBlockHeader(hash),
      'getBlockHeader'
    );
  }

  async getBlock(hash, verbosity = 1) {
    return await this._executeWithFallback(
      () => this.quicknode.getBlock(hash, verbosity),
      () => this.mempool.getBlock(hash),
      'getBlock'
    );
  }

  // === PROOF METHODS ===

  async getTxOutProof(txids, blockhash) {
    return await this._executeWithFallback(
      () => this.quicknode.getTxOutProof(txids, blockhash),
      async () => {
        const txid = Array.isArray(txids) ? txids[0] : txids;
        return await this.mempool.getMerkleProof(txid);
      },
      'getTxOutProof'
    );
  }

  async verifyTxOutProof(proof) {
    // Only QuickNode supports this, mempool.space doesn't
    try {
      return await this.quicknode.verifyTxOutProof(proof);
    } catch (error) {
      throw new Error(`verifyTxOutProof only supported via QuickNode: ${error.message}`);
    }
  }

  // === FEE ESTIMATION ===

  async getAverageFeeRate(blocks = 3, mode = 'CONSERVATIVE', buffer = 2) {
    return await this._executeWithFallback(
      () => this.quicknode.getAverageFeeRate(blocks, mode, buffer),
      async () => {
        const fees = await this.mempool.getFeeRecommendations();
        
        // Map blocks to fee type
        let feerate;
        if (blocks <= 1) feerate = fees.fastestFee;
        else if (blocks <= 3) feerate = fees.halfHourFee;
        else feerate = fees.hourFee;
        
        return feerate + buffer; // Already in sat/vB
      },
      'getAverageFeeRate'
    );
  }

  // === ADVANCED METHODS (QuickNode only) ===

  async getMempoolEntry(txid) {
    try {
      return await this.quicknode.getMempoolEntry(txid);
    } catch (error) {
      throw new Error(`getMempoolEntry only supported via QuickNode: ${error.message}`);
    }
  }

  async scanTxOutSetForAddress(address) {
    try {
      return await this.quicknode.scanTxOutSetForAddress(address);
    } catch (error) {
      throw new Error(`scanTxOutSetForAddress only supported via QuickNode: ${error.message}`);
    }
  }

  async getXPUB(xpub, options = { page: 1, size: 1000, fromHeight: 0, details: 'txids' }) {
    return await this._executeWithFallback(
      () => this.quicknode.getXPUB(xpub, options),
      () => this.mempool.getXpubInfo(xpub),
      'getXPUB'
    );
  }
}
