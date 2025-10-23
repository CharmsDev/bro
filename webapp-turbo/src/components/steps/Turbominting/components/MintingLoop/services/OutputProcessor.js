/**
 * OutputProcessor - Business logic for processing individual minting outputs
 * Handles the 4 sub-steps: Compose Payload → Call Prover → Sign → Broadcast
 */

import { PayloadService } from './PayloadService.js';
import { ProverService } from '../../../../../../services/prover/prover-service.js';
import { signCommitTx } from '../../../../../../services/bitcoin/signCommitTx.js';
import { signSpellTransaction } from '../../../../../../services/bitcoin/signSpellTx.js';
import { broadcastTxPackage } from '../../../../../../services/bitcoin/broadcastTx.js';
import { TxProofService } from '../../../../../../services/tx-proof-service.js';
import BitcoinApiRouter from '../../../../../../services/providers/bitcoin-api-router/index.js';
import { SUB_STEPS } from '../constants.js';

export class OutputProcessor {
  /**
   * Process a single output through all sub-steps
   * @param {Object} params - Processing parameters
   * @param {number} params.outputIndex - Index of the output to process
   * @param {Object} params.spendableOutput - Spendable output from turbomining
   * @param {Object} params.fundingUtxo - Funding UTXO for this output
   * @param {Object} params.turbominingData - Turbomining transaction data
   * @param {string} params.walletAddress - Wallet address for minting
   * @param {Function} params.updateSubStep - Callback to update sub-step status
   * @param {Function} params.updateOutputProgress - Callback to update progress
   * @returns {Promise<Object>} Result with commitTxid, spellTxid, success
   */
  static async processOutput({
    outputIndex,
    spendableOutput,
    fundingUtxo,
    turbominingData,
    walletAddress,
    updateSubStep,
    updateOutputProgress,
    outputData
  }) {
    const miningUtxo = outputData?.miningUtxo || {
      txid: turbominingData.miningTxid || turbominingData.txid,
      vout: spendableOutput.outputIndex,
      amount: spendableOutput.value || 333
    };
    
    const fundingUtxoData = outputData?.fundingUtxo || {
      txid: fundingUtxo.txid,
      vout: fundingUtxo.vout,
      amount: fundingUtxo.amount || fundingUtxo.value
    };
    
    if (!outputData?.miningUtxo || !outputData?.fundingUtxo) {
      updateOutputProgress(outputIndex, { miningUtxo, fundingUtxo: fundingUtxoData });
    }

    // SUB-STEP 1: Compose Payload
    updateSubStep(outputIndex, SUB_STEPS.COMPOSE_PAYLOAD);
    
    const txProofService = new TxProofService();
    const proofData = await txProofService.getTxProof(turbominingData.miningTxid);
    const txBlockProof = proofData.merkleproof || proofData.proof || "";
    
    const bitcoinApi = new BitcoinApiRouter();
    const fundingTxHex = await bitcoinApi.getRawTransaction(fundingUtxo.txid, false);
    
    if (!fundingTxHex) {
      throw new Error(`Failed to fetch transaction hex for ${fundingUtxo.txid}`);
    }
    
    const payload = PayloadService.composePayload(
      miningUtxo,
      fundingUtxoData,
      turbominingData,
      turbominingData.miningTxid,
      walletAddress,
      txBlockProof,
      fundingTxHex
    );
    PayloadService.validatePayload(payload);

    // SUB-STEP 2: Call Prover
    updateSubStep(outputIndex, SUB_STEPS.CALL_PROVER);
    
    
    const proverService = new ProverService();
    let proverResponse;
    try {
      proverResponse = await proverService.callProver(payload);
    } catch (proverError) {
      throw new Error(`Prover failed: ${proverError.message}${proverError.response?.data ? ' - ' + JSON.stringify(proverError.response.data) : ''}`);
    }
    
    if (!Array.isArray(proverResponse) || proverResponse.length !== 2) {
      throw new Error('Invalid prover response: expected array with 2 transactions');
    }
    
    const [commitTxHex, spellTxHex] = proverResponse;
    

    // SUB-STEP 3: Sign Transactions
    updateSubStep(outputIndex, SUB_STEPS.SIGN_TXS);
    
    const signedCommitTx = await signCommitTx(commitTxHex, fundingTxHex);
    const signedSpellTx = await signSpellTransaction(spellTxHex, signedCommitTx.signedHex, turbominingData.signedTxHex);
    
    if (!signedCommitTx?.signedHex || !signedSpellTx?.signedHex) {
      throw new Error('Transaction signing failed');
    }

    // SUB-STEP 4: Broadcast Package
    updateSubStep(outputIndex, SUB_STEPS.BROADCAST);
    
    // Create logging callback for this output
    const logCallback = () => {}; // Silent callback
    
    const broadcastResult = await broadcastTxPackage(signedCommitTx, signedSpellTx, logCallback);
    
    // Check if broadcast was successful
    if (!broadcastResult?.success) {
      throw new Error(`Broadcast failed: ${broadcastResult?.error || 'Unknown error'}`);
    }
    
    if (!broadcastResult?.commitData?.txid || !broadcastResult?.spellData?.txid) {
      throw new Error('Broadcast failed: missing transaction IDs');
    }

    // Save txids to progress
    updateOutputProgress(outputIndex, {
      commitTxid: broadcastResult.commitData.txid,
      spellTxid: broadcastResult.spellData.txid
    });
    
    
    return {
      commitTxid: broadcastResult.commitData.txid,
      spellTxid: broadcastResult.spellData.txid,
      success: broadcastResult.success
    };
  }
}
