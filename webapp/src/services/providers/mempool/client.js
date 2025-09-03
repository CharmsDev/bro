import { environmentConfig } from '../../../config/environment.js';

/**
 * MempoolClient - Cliente para mempool.space API
 * Maneja automáticamente mainnet vs testnet4 según configuración
 */
export default class MempoolClient {
  constructor() {
    this.baseUrl = environmentConfig.getMempoolApiBase();
    this.network = environmentConfig.getNetwork();
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        timeout: environmentConfig.getHttpTimeoutMs(),
        ...options
      });

      if (!response.ok) {
        throw new Error(`Mempool API error ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error(`[Mempool] Request failed: ${endpoint}`, error.message);
      throw error;
    }
  }

  // Broadcast transaction
  async broadcastTransaction(txHex) {
    return await this.request('/tx', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: txHex
    });
  }

  // Get transaction data
  async getTransaction(txid) {
    return await this.request(`/tx/${txid}`);
  }

  // Get transaction status
  async getTransactionStatus(txid) {
    return await this.request(`/tx/${txid}/status`);
  }

  // Get transaction hex
  async getTransactionHex(txid) {
    return await this.request(`/tx/${txid}/hex`);
  }

  // Get block header
  async getBlockHeader(hash) {
    return await this.request(`/block/${hash}/header`);
  }

  // Get block info
  async getBlock(hash) {
    return await this.request(`/block/${hash}`);
  }

  // Get block hash by height
  async getBlockHash(height) {
    return await this.request(`/block-height/${height}`);
  }

  // Get current block height
  async getBlockHeight() {
    return await this.request('/blocks/tip/height');
  }

  // Get address UTXOs
  async getAddressUtxos(address) {
    return await this.request(`/address/${address}/utxo`);
  }

  // Get address info
  async getAddressInfo(address) {
    return await this.request(`/address/${address}`);
  }

  // Get address transactions
  async getAddressTransactions(address, afterTxid = null) {
    const endpoint = afterTxid 
      ? `/address/${address}/txs/chain/${afterTxid}`
      : `/address/${address}/txs`;
    return await this.request(endpoint);
  }

  // Get merkle proof
  async getMerkleProof(txid) {
    return await this.request(`/tx/${txid}/merkleblock-proof`);
  }

  // Get fee recommendations
  async getFeeRecommendations() {
    return await this.request('/v1/fees/recommended');
  }

  // Get XPUB info (if supported)
  async getXpubInfo(xpub) {
    return await this.request(`/xpub/${xpub}`);
  }
}
