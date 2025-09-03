import { environmentConfig } from '../../config/environment.js';
import MempoolClient from './mempool/client.js';
import { MempoolNormalizer } from './adapters/mempool-normalizer.js';

/**
 * BitcoinApiRouter - Interfaz única para operaciones Bitcoin
 * Mantiene la misma API que QuickNodeClient pero dirige tráfico a mempool.space
 * Preparado para implementar QuickNode como fallback en el futuro
 */
export default class BitcoinApiRouter {
  constructor(url = null, apiKey = null) {
    // Mantener compatibilidad con constructor QuickNodeClient
    this.mempoolClient = new MempoolClient();
    this.network = environmentConfig.getNetwork();
    
    console.log(`[BitcoinApiRouter] Initialized with network: ${this.network} using mempool.space`);
  }

  // === MÉTODO RPC LEGACY (no usado directamente, pero mantenemos compatibilidad) ===
  async rpc(method, params = []) {
    throw new Error(`RPC method ${method} not supported in mempool-first router. Use specific methods instead.`);
  }

  // === BROADCAST METHODS ===
  async sendRawTransaction(hex) {
    try {
      const txid = await this.mempoolClient.broadcastTransaction(hex);
      console.log(`[BitcoinApiRouter] Transaction broadcast successful: ${txid}`);
      return txid;
    } catch (error) {
      console.error(`[BitcoinApiRouter] Broadcast failed:`, error.message);
      throw error;
    }
  }

  async submitPackage(hexes) {
    try {
      // Mempool no soporta package relay, intentamos secuencial
      console.log(`[BitcoinApiRouter] Attempting sequential package broadcast (${hexes.length} transactions)`);
      
      const results = [];
      for (let i = 0; i < hexes.length; i++) {
        const txid = await this.mempoolClient.broadcastTransaction(hexes[i]);
        results.push(txid);
        console.log(`[BitcoinApiRouter] Package tx ${i + 1}/${hexes.length} broadcast: ${txid}`);
      }

      // Devolver en formato compatible con QuickNode submitpackage
      return results; // Array de txids
    } catch (error) {
      console.error(`[BitcoinApiRouter] Package broadcast failed:`, error.message);
      throw error;
    }
  }

  // === TRANSACTION METHODS ===
  async getRawTransaction(txid, verbose = true) {
    try {
      if (!verbose) {
        // Devolver hex crudo
        return await this.mempoolClient.getTransactionHex(txid);
      }

      // Obtener datos completos y normalizar
      const [mempoolTx, mempoolStatus, currentHeight] = await Promise.all([
        this.mempoolClient.getTransaction(txid),
        this.mempoolClient.getTransactionStatus(txid),
        this.mempoolClient.getBlockHeight()
      ]);

      const normalized = MempoolNormalizer.normalizeGetRawTransaction(
        mempoolTx, 
        mempoolStatus, 
        currentHeight
      );

      // Añadir hex si se necesita
      if (verbose) {
        try {
          normalized.hex = await this.mempoolClient.getTransactionHex(txid);
        } catch (e) {
          // Hex opcional
        }
      }

      return normalized;
    } catch (error) {
      console.error(`[BitcoinApiRouter] getRawTransaction failed for ${txid}:`, error.message);
      throw error;
    }
  }

  async getMempoolEntry(txid) {
    try {
      // Mempool no tiene equivalente directo, construimos respuesta básica
      const [mempoolTx, mempoolStatus] = await Promise.all([
        this.mempoolClient.getTransaction(txid),
        this.mempoolClient.getTransactionStatus(txid)
      ]);

      if (mempoolStatus.confirmed) {
        throw new Error(`Transaction ${txid} is not in mempool (already confirmed)`);
      }

      // Formato aproximado a getmempoolentry
      return {
        vsize: mempoolTx.vsize || mempoolTx.size,
        weight: mempoolTx.weight || mempoolTx.size * 4,
        fee: mempoolTx.fee || 0,
        modifiedfee: mempoolTx.fee || 0,
        time: Date.now() / 1000, // Aproximado
        height: 0, // En mempool
        descendantcount: 1,
        descendantsize: mempoolTx.vsize || mempoolTx.size,
        descendantfees: mempoolTx.fee || 0,
        ancestorcount: 1,
        ancestorsize: mempoolTx.vsize || mempoolTx.size,
        ancestorfees: mempoolTx.fee || 0,
        wtxid: mempoolTx.txid, // Simplificado
        fees: {
          base: (mempoolTx.fee || 0) / 100000000, // sats to BTC
          modified: (mempoolTx.fee || 0) / 100000000,
          ancestor: (mempoolTx.fee || 0) / 100000000,
          descendant: (mempoolTx.fee || 0) / 100000000
        }
      };
    } catch (error) {
      console.error(`[BitcoinApiRouter] getMempoolEntry failed for ${txid}:`, error.message);
      throw error;
    }
  }

  // === BLOCK METHODS ===
  async getBlockHeader(hash, verbose = true) {
    try {
      if (!verbose) {
        return await this.mempoolClient.getBlockHeader(hash);
      }

      // Para verbose, necesitamos más datos
      const mempoolBlock = await this.mempoolClient.getBlock(hash);
      
      return {
        hash: mempoolBlock.id,
        confirmations: 1, // TODO: Calcular con currentHeight - mempoolBlock.height + 1
        height: mempoolBlock.height,
        version: mempoolBlock.version,
        versionHex: mempoolBlock.version.toString(16).padStart(8, '0'),
        merkleroot: mempoolBlock.merkle_root,
        time: mempoolBlock.timestamp,
        mediantime: mempoolBlock.mediantime || mempoolBlock.timestamp,
        nonce: mempoolBlock.nonce,
        bits: typeof mempoolBlock.bits === 'number' ? mempoolBlock.bits.toString(16) : mempoolBlock.bits,
        difficulty: mempoolBlock.difficulty,
        chainwork: '0'.repeat(64), // No disponible
        previousblockhash: mempoolBlock.previousblockhash,
        nextblockhash: undefined // Se obtendría por separado
      };
    } catch (error) {
      console.error(`[BitcoinApiRouter] getBlockHeader failed for ${hash}:`, error.message);
      throw error;
    }
  }

  async getBlockHash(height) {
    try {
      return await this.mempoolClient.getBlockHash(height);
    } catch (error) {
      console.error(`[BitcoinApiRouter] getBlockHash failed for height ${height}:`, error.message);
      throw error;
    }
  }

  async getBlock(hash, verbosity = 1) {
    try {
      const mempoolBlock = await this.mempoolClient.getBlock(hash);
      
      if (verbosity === 0) {
        // Devolver hex crudo (no disponible en mempool)
        throw new Error('Raw block hex not available via mempool.space');
      }

      let mempoolTxids = [];
      if (verbosity >= 1) {
        // Obtener lista de txids si se necesita
        try {
          mempoolTxids = await this.mempoolClient.request(`/block/${hash}/txids`);
        } catch (e) {
          console.warn(`[BitcoinApiRouter] Could not fetch txids for block ${hash}`);
          // Fallback: usar tx_count para indicar número de transacciones
          mempoolTxids = new Array(mempoolBlock.tx_count).fill('').map((_, i) => `tx_${i}`);
        }
      }

      return MempoolNormalizer.normalizeGetBlock(mempoolBlock, mempoolTxids, verbosity);
    } catch (error) {
      console.error(`[BitcoinApiRouter] getBlock failed for ${hash}:`, error.message);
      throw error;
    }
  }

  async getBlockCount() {
    try {
      return await this.mempoolClient.getBlockHeight();
    } catch (error) {
      console.error(`[BitcoinApiRouter] getBlockCount failed:`, error.message);
      throw error;
    }
  }

  // === PROOF METHODS ===
  async getTxOutProof(txids, blockhash) {
    try {
      const txidArray = Array.isArray(txids) ? txids : [txids];
      
      if (txidArray.length > 1) {
        console.warn(`[BitcoinApiRouter] Multiple txids in proof not fully supported, using first: ${txidArray[0]}`);
      }

      return await this.mempoolClient.getMerkleProof(txidArray[0]);
    } catch (error) {
      console.error(`[BitcoinApiRouter] getTxOutProof failed:`, error.message);
      throw error;
    }
  }

  async verifyTxOutProof(proof) {
    // Mempool no soporta verificación, devolvemos error claro
    throw new Error('verifyTxOutProof not supported via mempool.space. Use local verification or implement QuickNode fallback.');
  }

  // === ADDRESS METHODS ===
  async scanTxOutSetForAddress(address) {
    try {
      // Aproximación usando address UTXOs
      const utxos = await this.mempoolClient.getAddressUtxos(address);
      const currentHeight = await this.mempoolClient.getBlockHeight();
      
      // Formato aproximado a scantxoutset
      return {
        success: true,
        txouts: utxos.length,
        height: currentHeight,
        bestblock: '', // No disponible fácilmente
        unspents: utxos.map(utxo => ({
          txid: utxo.txid,
          vout: utxo.vout,
          scriptPubKey: '', // No disponible en respuesta básica
          amount: utxo.value / 100000000, // mempool.space devuelve en sats, Bitcoin Core espera BTC
          height: utxo.status.block_height || 0
        }))
      };
    } catch (error) {
      console.error(`[BitcoinApiRouter] scanTxOutSetForAddress failed for ${address}:`, error.message);
      throw error;
    }
  }

  async getAddressUtxos(address, options = { confirmed: true }) {
    try {
      const mempoolUtxos = await this.mempoolClient.getAddressUtxos(address);
      const currentHeight = await this.mempoolClient.getBlockHeight();
      
      return MempoolNormalizer.normalizeGetAddressUtxos(mempoolUtxos, currentHeight, options);
    } catch (error) {
      console.error(`[BitcoinApiRouter] getAddressUtxos failed for ${address}:`, error.message);
      throw error;
    }
  }

  async getAddressInfo(address, options = { page: 1, size: 1000, fromHeight: 0, details: 'txids' }) {
    try {
      const [mempoolAddress, mempoolTxs] = await Promise.all([
        this.mempoolClient.getAddressInfo(address),
        this.mempoolClient.getAddressTransactions(address)
      ]);
      
      return MempoolNormalizer.normalizeGetAddressInfo(mempoolAddress, mempoolTxs, options);
    } catch (error) {
      console.error(`[BitcoinApiRouter] getAddressInfo failed for ${address}:`, error.message);
      throw error;
    }
  }

  async getXPUB(xpub, options = { page: 1, size: 1000, fromHeight: 0, details: 'txids' }) {
    try {
      const mempoolXpub = await this.mempoolClient.getXpubInfo(xpub);
      return MempoolNormalizer.normalizeGetXPUB(mempoolXpub, options);
    } catch (error) {
      console.error(`[BitcoinApiRouter] getXPUB failed for ${xpub}:`, error.message);
      throw error;
    }
  }

  // === FEE ESTIMATION ===
  async getAverageFeeRate(blocks = 3, mode = 'CONSERVATIVE', buffer = 2) {
    try {
      const mempoolFees = await this.mempoolClient.getFeeRecommendations();
      const normalized = MempoolNormalizer.normalizeGetAverageFeeRate(mempoolFees, blocks, 0); // Sin buffer en normalizer
      
      // Calcular sat/vB final como hace QuickNodeClient
      const satPerVByte = Math.ceil(normalized.feerate * 1e5) + buffer;
      
      console.log(`[BitcoinApiRouter] Fee estimate: ${normalized.feerate} BTC/kvB → ${satPerVByte} sat/vB (${blocks} blocks, ${mode}, +${buffer})`);
      
      return satPerVByte;
    } catch (error) {
      console.error('[BitcoinApiRouter] Fee rate estimation failed:', error.message);
      // Fallback idéntico a QuickNodeClient
      const fallbackRate = 8;
      console.log(`[BitcoinApiRouter] Using fallback fee rate: ${fallbackRate} sat/vB`);
      return fallbackRate;
    }
  }
}
