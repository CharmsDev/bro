// TurbominingTransactionGenerator - Service for generating turbomining transactions
import { BitcoinTxBuilder } from '../transaction/transaction-builder-service.js';
import { ScureBitcoinTransactionSigner } from '../transaction/transaction-signer-service.js';
import { environmentConfig } from '../../config/environment.js';
import { calculateTotalCost, getAvailableUtxos } from '../../components/steps/Turbomining/utils/TurbominingCalculations.js';
import TurbominingModule from '../../modules/turbomining/TurbominingModule.js';

export class TurbominingTransactionGenerator {
  /**
   * Generate and sign turbomining transaction
   * @param {Object} params - Generation parameters
   * @param {number} params.numberOfOutputs - Number of outputs to create
   * @param {Object} params.miningResult - Mining result with nonce and hash
   * @param {Object} params.wallet - Wallet object with address and seedPhrase
   * @param {Object} params.walletUtxos - Available wallet UTXOs
   * @param {Object} params.miningState - Mining state with challenge UTXO info
   * @returns {Promise<Object>} Generated transaction data
   */
  async generateTransaction({ numberOfOutputs, miningResult, wallet, walletUtxos, miningState }) {
    if (!miningResult) {
      throw new Error('Missing mining result');
    }
    
    if (!wallet?.address) {
      throw new Error('Missing wallet address');
    }

    // Get available UTXOs from wallet
    const availableUtxos = getAvailableUtxos(walletUtxos);
    
    if (!availableUtxos || availableUtxos.length === 0) {
      throw new Error('No UTXOs available in wallet. Please fund your wallet first.');
    }

    // Calculate total cost needed
    const totalCost = calculateTotalCost(numberOfOutputs);

    // Normalize UTXOs to have consistent 'amount' property
    const normalizedUtxos = availableUtxos.map(utxo => ({
      ...utxo,
      amount: utxo.value || utxo.amount || 0
    }));

    // CRITICAL: Use the challenge UTXO as input (the one used for mining)
    // This MUST be the input 0 of the mining transaction
    let suitableUtxo = null;
    
    if (miningState?.challengeTxid && miningState?.challengeVout !== undefined) {
      // Find the challenge UTXO in available UTXOs
      suitableUtxo = normalizedUtxos.find(utxo => 
        utxo.txid === miningState.challengeTxid && 
        utxo.vout === miningState.challengeVout
      );
      
      if (!suitableUtxo) {
        throw new Error(`Challenge UTXO ${miningState.challengeTxid}:${miningState.challengeVout} not found in wallet. This UTXO was used for mining and must be available.`);
      }
      
      // Verify it has enough funds
      if (suitableUtxo.amount < totalCost) {
        throw new Error(`Challenge UTXO has insufficient funds. Need ${totalCost} sats, has ${suitableUtxo.amount} sats.`);
      }
      
    } else {
      // Fallback: Select largest UTXO (should not happen in normal flow)
      suitableUtxo = normalizedUtxos
        .filter(utxo => utxo.amount >= totalCost)
        .sort((a, b) => b.amount - a.amount)[0];
      
      if (!suitableUtxo) {
        const maxAvailable = Math.max(...normalizedUtxos.map(u => u.amount));
        throw new Error(`No UTXO with sufficient funds. Need ${totalCost} sats, largest available: ${maxAvailable} sats.`);
      }
    }

    const confirmStatus = suitableUtxo.confirmed ? 'CONFIRMED' : 'UNCONFIRMED';

    // Final normalized UTXO for transaction building
    const normalizedUtxo = {
      ...suitableUtxo,
      amount: suitableUtxo.amount,
      value: suitableUtxo.amount  // Ensure both properties exist
    };

    // Get wallet keys from WalletStorage (centralized)
    const { WalletStorage } = await import('../../storage/index.js');
    const extendedAddresses = WalletStorage.loadExtendedAddresses();
    const walletKeys = extendedAddresses?.recipient?.[0];
    
    if (!walletKeys?.xOnlyPubkey) {
      throw new Error('Wallet keys not found. Please regenerate wallet in Step 1.');
    }

    // Create transaction
    
    const txBuilder = new BitcoinTxBuilder();
    const result = await txBuilder.createTurbominingTransaction(
      normalizedUtxo,
      numberOfOutputs,
      miningResult,
      wallet.address,
      walletKeys
    );

    const signer = new ScureBitcoinTransactionSigner();
    const psbtHex = result.psbt.toHex();
    const signResult = await signer.signPSBTWithPrivateKey(
      psbtHex,
      normalizedUtxo,
      walletKeys.privateKey,
      walletKeys.xOnlyPubkey
    );

    const updatedSpendableOutputs = result.spendableOutputs.map((output) => ({
      ...output,
      utxoId: `${signResult.txid}:${output.outputIndex}`
    }));

    const transactionData = {
      ...result,
      signedTxHex: signResult.signedTxHex,
      txid: signResult.txid,
      miningTxid: signResult.txid,
      numberOfOutputs: result.totalOutputs,
      spendableOutputs: updatedSpendableOutputs,
      miningData: result.miningData,
      miningResult
    };

    const turbominingData = {
      numberOfOutputs: transactionData.numberOfOutputs,
      spendableOutputs: transactionData.spendableOutputs,
      changeAmount: transactionData.changeAmount,
      miningData: {
        ...transactionData.miningData,
        nonce: Number(transactionData.miningData.nonce),
        reward: Number(transactionData.miningData.reward)
      },
      signedTxHex: transactionData.signedTxHex,
      miningTxid: transactionData.miningTxid,
      timestamp: Date.now(),
      status: 'ready_to_broadcast'
    };
    
    TurbominingModule.save(turbominingData);

    return transactionData;
  }
}
