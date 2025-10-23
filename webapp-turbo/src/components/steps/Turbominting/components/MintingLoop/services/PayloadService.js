// Payload Composition Service
import { REQUEST_TEMPLATE } from '../../../../../../services/prover/index.js';

export class PayloadService {
  /**
   * Compose payload for a single output using the correct template
   * @param {Object} miningUtxo - Mining UTXO from output object { txid, vout, amount }
   * @param {Object} fundingUtxo - Funding UTXO from output object { txid, vout, amount }
   * @param {Object} turbominingData - Turbomining data with miningData (nonce, hash, txHex, reward)
   * @param {string} miningTxid - Mining transaction ID
   * @param {string} walletAddress - Wallet address
   * @param {string} txBlockProof - Transaction block proof (merkle proof)
   * @param {string} fundingTxHex - Funding transaction hex (required for prev_txs)
   * @returns {Object} Payload for prover
   */
  static composePayload(miningUtxo, fundingUtxo, turbominingData, miningTxid, walletAddress, txBlockProof, fundingTxHex) {
    if (!miningUtxo) throw new Error('Mining UTXO is required');
    if (!fundingUtxo) throw new Error('Funding UTXO is required');
    if (!turbominingData) throw new Error('Turbomining data is required');
    if (!turbominingData.miningData) throw new Error('Mining data is required in turbominingData');
    if (!miningTxid) throw new Error('Mining TXID is required');
    if (!walletAddress) throw new Error('Wallet address is required');

    const payload = JSON.parse(JSON.stringify(REQUEST_TEMPLATE));

    payload.spell.private_inputs["$01"].tx = turbominingData.signedTxHex;
    payload.spell.private_inputs["$01"].tx_block_proof = txBlockProof || "";

    payload.spell.ins[0].utxo_id = `${miningUtxo.txid}:${miningUtxo.vout}`;

    const rewardAmount = turbominingData.miningData.reward;
    
    payload.spell.outs[0].address = walletAddress;
    payload.spell.outs[0].charms["$01"] = rewardAmount;

    const prevTxs = [turbominingData.signedTxHex];
    payload.prev_txs = prevTxs;

    payload.funding_utxo = `${fundingUtxo.txid}:${fundingUtxo.vout}`;
    payload.funding_utxo_value = fundingUtxo.value || fundingUtxo.amount;

    payload.change_address = walletAddress;
    payload.fee_rate = 1;
    payload.chain = "bitcoin";

    return payload;
  }

  /**
   * Validate payload structure
   */
  static validatePayload(payload) {
    // Validate spell structure
    if (!payload.spell) throw new Error('Missing spell section');
    if (!payload.spell.private_inputs) throw new Error('Missing private_inputs');
    if (!payload.spell.ins || !Array.isArray(payload.spell.ins)) throw new Error('Missing ins array');
    if (!payload.spell.outs || !Array.isArray(payload.spell.outs)) throw new Error('Missing outs array');
    
    // Validate required fields
    if (!payload.funding_utxo) throw new Error('Missing funding_utxo');
    if (!payload.change_address) throw new Error('Missing change_address');
    
    return true;
  }

  /**
   * Create downloadable payload JSON
   */
  static createDownloadablePayload(payload, outputIndex) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payload-output-${outputIndex + 1}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
