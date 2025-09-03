/**
 * Adaptador para normalizar respuestas de mempool.space al formato QuickNode/Bitcoin Core
 */

export class MempoolNormalizer {
  
  /**
   * Normaliza getRawTransaction de mempool a formato Bitcoin Core
   */
  static normalizeGetRawTransaction(mempoolTx, mempoolStatus, currentHeight) {
    const confirmations = mempoolStatus.confirmed 
      ? (currentHeight - mempoolStatus.block_height + 1)
      : 0;

    return {
      txid: mempoolTx.txid,
      hash: mempoolTx.txid, // Para SegWit sería diferente, pero simplificamos
      version: mempoolTx.version,
      size: mempoolTx.size,
      vsize: mempoolTx.vsize || mempoolTx.size,
      weight: mempoolTx.weight || mempoolTx.size * 4,
      locktime: mempoolTx.locktime,
      vin: mempoolTx.vin.map(input => ({
        txid: input.txid,
        vout: input.vout,
        scriptSig: {
          asm: input.scriptsig_asm || '',
          hex: input.scriptsig || ''
        },
        txinwitness: input.witness || [],
        sequence: input.sequence
      })),
      vout: mempoolTx.vout.map(output => ({
        value: output.value / 100000000, // sats to BTC
        n: output.n,
        scriptPubKey: {
          asm: output.scriptpubkey_asm || '',
          hex: output.scriptpubkey || '',
          type: output.scriptpubkey_type || '',
          address: output.scriptpubkey_address || undefined
        }
      })),
      hex: undefined, // Se obtiene por separado si se necesita
      blockhash: mempoolStatus.block_hash || undefined,
      confirmations: confirmations,
      time: mempoolStatus.block_time || undefined,
      blocktime: mempoolStatus.block_time || undefined,
      height: mempoolStatus.block_height || undefined,
      fee: mempoolTx.fee ? mempoolTx.fee / 100000000 : undefined // sats to BTC
    };
  }

  /**
   * Normaliza getAddressUtxos de mempool a formato Blockbook bb_getUTXOs
   */
  static normalizeGetAddressUtxos(mempoolUtxos, currentHeight, options = {}) {
    return mempoolUtxos
      .filter(utxo => {
        if (options.confirmed === true) {
          return utxo.status.confirmed;
        } else if (options.confirmed === false) {
          return !utxo.status.confirmed;
        }
        return true; // Incluir todos si no se especifica
      })
      .map(utxo => {
        const confirmations = utxo.status.confirmed 
          ? (currentHeight - utxo.status.block_height + 1)
          : 0;

        return {
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value, // Ya en sats
          confirmations: confirmations,
          height: utxo.status.block_height || null,
          coinbase: false // Mempool no indica esto, asumimos false
        };
      });
  }

  /**
   * Normaliza getAddressInfo de mempool a formato Blockbook bb_getAddress
   */
  static normalizeGetAddressInfo(mempoolAddress, mempoolTxs = [], options = {}) {
    const { page = 1, size = 1000, details = 'txids' } = options;
    
    // Paginación simple
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedTxs = mempoolTxs.slice(startIndex, endIndex);

    return {
      address: mempoolAddress.address,
      balance: mempoolAddress.chain_stats.funded_txo_sum.toString(),
      totalReceived: mempoolAddress.chain_stats.funded_txo_sum.toString(),
      totalSent: mempoolAddress.chain_stats.spent_txo_sum.toString(),
      unconfirmedBalance: mempoolAddress.mempool_stats.funded_txo_sum.toString(),
      unconfirmedTxs: mempoolAddress.mempool_stats.tx_count,
      txs: mempoolAddress.chain_stats.tx_count + mempoolAddress.mempool_stats.tx_count,
      txids: details === 'txids' ? paginatedTxs.map(tx => tx.txid) : undefined,
      transactions: details === 'txs' ? paginatedTxs : undefined,
      page: page,
      totalPages: Math.ceil((mempoolAddress.chain_stats.tx_count + mempoolAddress.mempool_stats.tx_count) / size)
    };
  }

  /**
   * Normaliza fee recommendations de mempool a estimatesmartfee
   */
  static normalizeGetAverageFeeRate(mempoolFees, blocks = 3, buffer = 0) {
    let feerate;
    
    // Mapear blocks a tipo de fee de mempool
    if (blocks <= 1) {
      feerate = mempoolFees.fastestFee;
    } else if (blocks <= 3) {
      feerate = mempoolFees.halfHourFee;
    } else {
      feerate = mempoolFees.hourFee;
    }

    // Añadir buffer (si se especifica) y devolver en formato Bitcoin Core
    const finalRate = feerate + buffer;
    
    return {
      feerate: finalRate / 100000, // sat/vB to BTC/kvB para compatibilidad
      blocks: blocks
    };
  }

  /**
   * Normaliza block info de mempool a formato Bitcoin Core getblock
   */
  static normalizeGetBlock(mempoolBlock, mempoolTxids = [], verbosity = 1) {
    const result = {
      hash: mempoolBlock.id,
      confirmations: 1, // Simplificado, se calcularía con tip height
      height: mempoolBlock.height,
      version: mempoolBlock.version,
      versionHex: mempoolBlock.version.toString(16).padStart(8, '0'),
      merkleroot: mempoolBlock.merkle_root,
      time: mempoolBlock.timestamp,
      mediantime: mempoolBlock.mediantime || mempoolBlock.timestamp,
      nonce: mempoolBlock.nonce,
      bits: mempoolBlock.bits.toString(16),
      difficulty: mempoolBlock.difficulty,
      chainwork: '0'.repeat(64), // No disponible en mempool
      nTx: mempoolBlock.tx_count,
      previousblockhash: mempoolBlock.previousblockhash,
      nextblockhash: undefined, // Se obtendría por separado
      strippedsize: mempoolBlock.size,
      size: mempoolBlock.size,
      weight: mempoolBlock.weight
    };

    if (verbosity >= 1) {
      result.tx = mempoolTxids;
    }

    return result;
  }

  /**
   * Normaliza XPUB info de mempool a formato Blockbook
   */
  static normalizeGetXPUB(mempoolXpub, options = {}) {
    const { page = 1, size = 1000, details = 'txids' } = options;
    
    return {
      xpub: mempoolXpub.xpub,
      balance: mempoolXpub.balance.toString(),
      totalReceived: mempoolXpub.totalReceived.toString(),
      totalSent: mempoolXpub.totalSent.toString(),
      unconfirmedBalance: mempoolXpub.unconfirmedBalance.toString(),
      unconfirmedTxs: mempoolXpub.unconfirmedTxs,
      txs: mempoolXpub.txs,
      txids: details === 'txids' ? mempoolXpub.txids : undefined,
      usedTokens: mempoolXpub.usedTokens || 0,
      tokens: mempoolXpub.tokens || [],
      page: page,
      totalPages: Math.ceil(mempoolXpub.txs / size)
    };
  }
}
