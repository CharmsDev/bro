import * as btc from '@scure/btc-signer';
import { hex } from '@scure/base';
import { environmentConfig } from '../../../../config/environment.js';
import { buildOutputsFromAnalysis } from './helpers/output-builder.js';
import { signTransaction, decodeTransaction } from './helpers/transaction-signer.js';
import { analyzeFundingNeeds as simpleAnalyzer } from './helpers/funding-analyzer.js';

export class FundingTxBuilder {
  constructor() {
    this.network = environmentConfig.isTestnet() 
      ? btc.TEST_NETWORK 
      : btc.NETWORK;
  }

  async analyzeFundingNeeds(availableUtxos, requiredOutputs) {
    // Use the new simple analyzer
    return simpleAnalyzer(availableUtxos, requiredOutputs);
  }

  createFundingTransaction(analysis, walletAddress, walletKeys) {
    if (!analysis.needsSplitting) {
      return {
        needsTransaction: false,
        sufficientUtxos: analysis.utxosToUse
      };
    }

    const tx = new btc.Transaction({ allowUnknownOutputs: true });
    
    // Build outputs array from analysis details using helper
    const outputs = buildOutputsFromAnalysis(analysis);

    // Add inputs to transaction
    analysis.inputUtxos.forEach((utxo, idx) => {
      // Create p2tr for script (same as mining transaction)
      const xOnlyPubkey = Buffer.from(walletKeys.xOnlyPubkey, 'hex');
      const p2tr = btc.p2tr(xOnlyPubkey, undefined, this.network);

      const inputConfig = {
        txid: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: p2tr.script,
          amount: BigInt(utxo.value)
        },
        tapInternalKey: xOnlyPubkey
      };

      tx.addInput(inputConfig);
    });

    // Add outputs to transaction
    outputs.forEach((output, idx) => {
      tx.addOutputAddress(walletAddress, BigInt(output.value), this.network);
    });


    return {
      needsTransaction: true,
      tx,
      inputUtxos: analysis.inputUtxos,
      outputs,
      totalInputValue: analysis.mathematics.totalInput,
      totalOutputValue: analysis.mathematics.totalOutput,
      totalChange: analysis.mathematics.totalChange,
      estimatedFee: analysis.mathematics.totalFee
    };
  }

  signFundingTransaction(tx, privateKeyHex, inputCount) {
    return signTransaction(tx, privateKeyHex, inputCount);
  }

  decodeFundingTransaction(tx) {
    return decodeTransaction(tx);
  }

  async buildAndSignFundingTx(analysis, walletAddress, walletKeys) {
    if (!analysis.needsSplitting) {
      return {
        needsTransaction: false,
        sufficientUtxos: analysis.utxosToUse,
        analysis
      };
    }
    
    if (analysis.error) {
      throw new Error(analysis.error);
    }

    const txData = this.createFundingTransaction(analysis, walletAddress, walletKeys);
    const signed = this.signFundingTransaction(txData.tx, walletKeys.privateKey, txData.inputUtxos.length);
    const decoded = this.decodeFundingTransaction(signed.tx);

    decoded.inputs = txData.inputUtxos.map((utxo, idx) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      sequence: txData.tx.getInput(idx).sequence || 0xffffffff
    }));

    return {
      needsTransaction: true,
      ...txData,
      ...signed,
      decoded,
      analysis
    };
  }
}
