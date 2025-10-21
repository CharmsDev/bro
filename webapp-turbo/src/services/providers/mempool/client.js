import { environmentConfig } from '../../../config/environment.js';

/**
 * MempoolClient - Mempool.space API client for fallback operations
 */
export default class MempoolClient {
  constructor() {
    this.baseUrl = environmentConfig.getMempoolApiBase();
  }

  async _fetch(endpoint) {
    const url = `${this.baseUrl}${endpoint}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`Mempool API error: ${res.status} ${res.statusText}`);
    }
    
    return await res.json();
  }

  async getAddressUtxos(address) {
    return await this._fetch(`/address/${address}/utxo`);
  }

  async getAddressInfo(address) {
    return await this._fetch(`/address/${address}`);
  }

  async getTransaction(txid) {
    return await this._fetch(`/tx/${txid}`);
  }

  async getTransactionStatus(txid) {
    return await this._fetch(`/tx/${txid}/status`);
  }

  async getTransactionHex(txid) {
    return await this._fetch(`/tx/${txid}/hex`);
  }

  async getBlockHeight() {
    return await this._fetch('/blocks/tip/height');
  }

  async getBlockHash(height) {
    return await this._fetch(`/block-height/${height}`);
  }

  async getBlockHeader(hash) {
    return await this._fetch(`/block/${hash}/header`);
  }

  async getBlock(hash) {
    return await this._fetch(`/block/${hash}`);
  }

  async getFeeRecommendations() {
    return await this._fetch('/v1/fees/recommended');
  }

  async getMerkleProof(txid) {
    return await this._fetch(`/tx/${txid}/merkle-proof`);
  }

  async broadcastTransaction(hex) {
    const res = await fetch(`${this.baseUrl}/tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: hex
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Broadcast failed: ${error}`);
    }

    return await res.text(); // Returns txid
  }

  async getXpubInfo(xpub) {
    // Mempool.space doesn't support XPUB directly, return empty
    return { txs: [], balance: 0 };
  }
}
