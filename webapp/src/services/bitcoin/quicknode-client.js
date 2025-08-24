import { environmentConfig } from '../../config/environment.js';

/**
 * QuickNodeClient - thin wrapper over Bitcoin Core JSON-RPC via QuickNode
 */
export default class QuickNodeClient {
  constructor(url = environmentConfig.getQuickNodeUrl(), apiKey = environmentConfig.getQuickNodeApiKey()) {
    if (!url || !apiKey) throw new Error('QuickNode credentials not configured');
    this.url = url;
    this.apiKey = apiKey;
  }

  async rpc(method, params = []) {
    console.log(`[QuickNode] 🔄 RPC Call: ${method}`, {
      url: this.url,
      method,
      params,
      timestamp: new Date().toISOString()
    });
    
    const requestBody = { jsonrpc: '2.0', id: 1, method, params };
    console.log(`[QuickNode] 📤 Request Body:`, requestBody);
    
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log(`[QuickNode] 📡 HTTP Response Status: ${res.status} ${res.statusText}`);
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[QuickNode] ❌ HTTP Error:`, { status: res.status, statusText: res.statusText, body: text });
      throw new Error(`RPC HTTP ${res.status}: ${text.slice(0,200)}`);
    }
    
    const json = await res.json();
    console.log(`[QuickNode] 📥 RPC Response:`, json);
    
    if (json.error) {
      console.error(`[QuickNode] ❌ RPC Error:`, json.error);
      throw new Error(`RPC ${method} error: ${json.error.message}`);
    }
    
    console.log(`[QuickNode] ✅ RPC Success - ${method} returned:`, json.result);
    return json.result;
  }

  // Common helpers
  sendRawTransaction(hex) { return this.rpc('sendrawtransaction', [hex]); }
  submitPackage(hexes) { return this.rpc('submitpackage', [hexes]); }
  getRawTransaction(txid, verbose = true) { return this.rpc('getrawtransaction', [txid, verbose ? true : false]); }
  getMempoolEntry(txid) { return this.rpc('getmempoolentry', [txid]); }
  getBlockHeader(hash, verbose = true) { return this.rpc('getblockheader', [hash, verbose ? true : false]); }
  getBlockHash(height) { return this.rpc('getblockhash', [height]); }
  getBlock(hash, verbosity = 1) { return this.rpc('getblock', [hash, verbosity]); }
  getTxOutProof(txids, blockhash) {
    const params = [Array.isArray(txids) ? txids : [txids]];
    if (blockhash) params.push(blockhash);
    return this.rpc('gettxoutproof', params);
  }
  verifyTxOutProof(proof) { return this.rpc('verifytxoutproof', [proof]); }
  getBlockCount() { return this.rpc('getblockcount'); }
  // Scan UTXO set for an address using descriptor
  scanTxOutSetForAddress(address) {
    // Use raw descriptor: addr(address)
    return this.rpc('scantxoutset', ['start', [{ desc: `addr(${address})`, range: null }]]);
  }

  // Blockbook add-on methods for address operations
  // Get UTXOs for a specific address
  async getAddressUtxos(address, options = { confirmed: true }) {
    console.log(`[QuickNode] 🔍 Getting UTXOs for address: ${address}`, { options });
    const result = await this.rpc('bb_getUTXOs', [address, options]);
    console.log(`[QuickNode] 💰 UTXO Result for ${address}:`, {
      utxoCount: Array.isArray(result) ? result.length : 'not array',
      result: result,
      totalValue: Array.isArray(result) ? result.reduce((sum, utxo) => sum + parseInt(utxo.value || 0), 0) : 'N/A'
    });
    return result;
  }

  // Get address information (balance, transactions, etc.)
  getAddressInfo(address, options = { page: 1, size: 1000, fromHeight: 0, details: 'txids' }) {
    return this.rpc('bb_getAddress', [address, options]);
  }

  // Get XPUB information
  getXPUB(xpub, options = { page: 1, size: 1000, fromHeight: 0, details: 'txids' }) {
    return this.rpc('bb_getXPUB', [xpub, options]);
  }
}
