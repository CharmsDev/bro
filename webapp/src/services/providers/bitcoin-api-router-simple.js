import { environmentConfig } from '../../config/environment.js';

/**
 * BitcoinApiRouter - Versión SIMPLIFICADA
 * Solo los métodos críticos que realmente usa la aplicación
 */
export default class BitcoinApiRouter {
  constructor() {
    this.baseUrl = environmentConfig.getMempoolApiBase();
    console.log(`[BitcoinApiRouter] Initialized with mempool.space`);
  }

  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`Mempool API error ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    return contentType?.includes('application/json') ? response.json() : response.text();
  }

  // === MÉTODOS CRÍTICOS ===
  
  async sendRawTransaction(hex) {
    return await this._request('/tx', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: hex
    });
  }

  async submitPackage(hexes) {
    const results = [];
    for (const hex of hexes) {
      const txid = await this.sendRawTransaction(hex);
      results.push(txid);
    }
    return results; // Array de txids compatible con QuickNode
  }

  async getRawTransaction(txid, verbose = true) {
    if (!verbose) {
      return await this._request(`/tx/${txid}/hex`);
    }

    // Obtener datos y normalizar inline (sin clase separada)
    const [tx, status, height] = await Promise.all([
      this._request(`/tx/${txid}`),
      this._request(`/tx/${txid}/status`),
      this._request('/blocks/tip/height')
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
        value: out.value / 100000000 // sats to BTC
      })),
      confirmations,
      blockhash: status.block_hash,
      blocktime: status.block_time,
      time: status.block_time,
      height: status.block_height,
      fee: tx.fee ? tx.fee / 100000000 : undefined
    };
  }

  async getAddressUtxos(address, options = { confirmed: true }) {
    const [utxos, height] = await Promise.all([
      this._request(`/address/${address}/utxo`),
      this._request('/blocks/tip/height')
    ]);

    return utxos
      .filter(utxo => options.confirmed ? utxo.status.confirmed : true)
      .map(utxo => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value, // Ya en sats
        confirmations: utxo.status.confirmed ? (height - utxo.status.block_height + 1) : 0,
        height: utxo.status.block_height || null
      }));
  }

  async getAverageFeeRate(blocks = 3, mode = 'CONSERVATIVE', buffer = 2) {
    try {
      const fees = await this._request('/v1/fees/recommended');
      
      // Mapear blocks a fee type
      let feerate;
      if (blocks <= 1) feerate = fees.fastestFee;
      else if (blocks <= 3) feerate = fees.halfHourFee;
      else feerate = fees.hourFee;
      
      return feerate + buffer; // Directo en sat/vB
    } catch (error) {
      console.warn('[BitcoinApiRouter] Fee estimation failed, using fallback');
      return 8; // Fallback
    }
  }

  // === MÉTODOS OPCIONALES (implementación mínima) ===
  
  async getTxOutProof(txids) {
    const txid = Array.isArray(txids) ? txids[0] : txids;
    return await this._request(`/tx/${txid}/merkleblock-proof`);
  }

  async getBlockCount() {
    return await this._request('/blocks/tip/height');
  }

  async getBlockHash(height) {
    return await this._request(`/block-height/${height}`);
  }

  // Métodos no soportados - error claro
  async verifyTxOutProof() {
    throw new Error('verifyTxOutProof not supported via mempool.space');
  }

  async getMempoolEntry() {
    throw new Error('getMempoolEntry not implemented in simplified version');
  }

  async getBlockHeader() {
    throw new Error('getBlockHeader not implemented in simplified version');
  }

  async getBlock() {
    throw new Error('getBlock not implemented in simplified version');
  }

  async scanTxOutSetForAddress() {
    throw new Error('scanTxOutSetForAddress not implemented in simplified version');
  }

  async getAddressInfo() {
    throw new Error('getAddressInfo not implemented in simplified version');
  }

  async getXPUB() {
    throw new Error('getXPUB not implemented in simplified version');
  }
}
