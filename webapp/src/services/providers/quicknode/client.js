import { environmentConfig } from '../../../config/environment.js';

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
    const network = environmentConfig.getNetwork() === 'mainnet' ? 'mainnet' : 'testnet4';

    // Endpoint verification logging - keep only for mainnet/testnet4 verification
    const endpointType = network === 'mainnet' ? 'MAINNET' : 'TESTNET4';
    console.log(`[QuickNode] Network: ${network} | Endpoint: ${endpointType} | Method: ${method}`);

    // Direct QuickNode API call - no proxy
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    const requestBody = {
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    };

    const res = await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`RPC HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json();

    if (json.error) {
      throw new Error(`RPC ${method} error: ${json.error.message}`);
    }

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
    const result = await this.rpc('bb_getUTXOs', [address, options]);
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

  /**
   * Get average fee rate in sat/vB using estimatesmartfee
   * Converts from BTC/kvB to sat/vB and adds 1-2 sat/vB buffer
   * @param {number} blocks - Number of blocks for fee estimation (default: 3)
   * @param {string} mode - Estimation mode: 'CONSERVATIVE' or 'ECONOMICAL' (default: 'CONSERVATIVE')
   * @param {number} buffer - Additional sat/vB to add (default: 2)
   * @returns {Promise<number>} Fee rate in sat/vB
   */
  async getAverageFeeRate(blocks = 3, mode = 'CONSERVATIVE', buffer = 2) {
    try {
      const result = await this.rpc('estimatesmartfee', [blocks, mode]);
      
      if (!result || !result.feerate) {
        throw new Error('No fee rate returned from estimatesmartfee');
      }

      // Convert BTC/kvB to sat/vB
      // 1 BTC = 1e8 sats, 1 kvB = 1000 vB
      // Formula: sat_vB = feerate_BTC_per_kvB * 1e5
      const satPerVByte = Math.ceil(result.feerate * 1e5) + buffer;
      
      console.log(`[QuickNode] Fee estimate: ${result.feerate} BTC/kvB → ${satPerVByte} sat/vB (${blocks} blocks, ${mode}, +${buffer})`);
      
      return satPerVByte;
    } catch (error) {
      console.error('[QuickNode] Fee rate estimation failed:', error.message);
      // Fallback to reasonable default (7-8 sat/vB for fast confirmation)
      const fallbackRate = 8;
      console.log(`[QuickNode] Using fallback fee rate: ${fallbackRate} sat/vB`);
      return fallbackRate;
    }
  }
}
