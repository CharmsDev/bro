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

    const availableUtxos = getAvailableUtxos(walletUtxos);
    
    if (!availableUtxos || availableUtxos.length === 0) {
      throw new Error('No UTXOs available in wallet. Please fund your wallet first.');
    }

    const totalCost = calculateTotalCost(numberOfOutputs);

    const normalizedUtxos = availableUtxos.map(utxo => ({
      ...utxo,
      amount: utxo.value || utxo.amount || 0
    }));

    let suitableUtxo = null;
    
    if (miningState?.challengeTxid && miningState?.challengeVout !== undefined) {
      suitableUtxo = normalizedUtxos.find(utxo => 
        utxo.txid === miningState.challengeTxid && 
        utxo.vout === miningState.challengeVout
      );
      
      if (!suitableUtxo) {
        console.warn(`Challenge UTXO ${miningState.challengeTxid}:${miningState.challengeVout} not found. Using fallback (largest UTXO).`);
        
        suitableUtxo = normalizedUtxos
          .filter(utxo => utxo.amount >= totalCost)
          .sort((a, b) => b.amount - a.amount)[0];
        
        if (!suitableUtxo) {
          const maxAvailable = Math.max(...normalizedUtxos.map(u => u.amount));
          throw new Error(`No UTXO with sufficient funds. Need ${totalCost} sats, largest available: ${maxAvailable} sats.`);
        }
      }
      
      if (suitableUtxo.amount < totalCost) {
        throw new Error(`Challenge UTXO has insufficient funds. Need ${totalCost} sats, has ${suitableUtxo.amount} sats.`);
      }
      
    } else {
      suitableUtxo = normalizedUtxos
        .filter(utxo => utxo.amount >= totalCost)
        .sort((a, b) => b.amount - a.amount)[0];
      
      if (!suitableUtxo) {
        const maxAvailable = Math.max(...normalizedUtxos.map(u => u.amount));
        throw new Error(`No UTXO with sufficient funds. Need ${totalCost} sats, largest available: ${maxAvailable} sats.`);
      }
    }

    const normalizedUtxo = {
      ...suitableUtxo,
      amount: suitableUtxo.amount,
      value: suitableUtxo.amount
    };

    const { WalletStorage } = await import('../../storage/index.js');
    const extendedAddresses = WalletStorage.loadExtendedAddresses();
    const walletKeys = extendedAddresses?.recipient?.[0];
    
    if (!walletKeys?.xOnlyPubkey) {
      throw new Error('Wallet keys not found. Please regenerate wallet in Step 1.');
    }

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
      // Don't set miningTxid here - it will be set after successful broadcast
      // This prevents confusion between "transaction generated" vs "transaction broadcast"
      timestamp: Date.now(),
      status: 'ready_to_broadcast'
    };
    
    TurbominingModule.save(turbominingData);

    return transactionData;
  }
}
