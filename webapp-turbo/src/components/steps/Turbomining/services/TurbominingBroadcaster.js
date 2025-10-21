import { broadcastTx } from '../../../../services/bitcoin/broadcastTx.js';
import TurbominingModule from '../../../../modules/turbomining/TurbominingModule.js';

export class TurbominingBroadcaster {
  async broadcastTransaction(generatedTransaction) {
    if (!generatedTransaction?.signedTxHex) {
      throw new Error('No signed transaction to broadcast');
    }

    const broadcastResult = await broadcastTx(generatedTransaction.signedTxHex);

    const challengeTxid = generatedTransaction.miningData?.inputTxid || generatedTransaction.miningData?.challengeTxid;
    const challengeVout = generatedTransaction.miningData?.inputVout ?? generatedTransaction.miningData?.challengeVout;
    const challengeUtxo = challengeTxid && challengeVout !== undefined ? `${challengeTxid}:${challengeVout}` : null;

    const updatedSpendableOutputs = generatedTransaction.spendableOutputs.map(output => ({
      ...output,
      utxoId: `${broadcastResult.txid}:${output.outputIndex}`
    }));

    const transactionData = {
      miningTxid: broadcastResult.txid,  
      signedTxHex: generatedTransaction.signedTxHex,
      explorerUrl: broadcastResult.explorerUrl,
      numberOfOutputs: generatedTransaction.numberOfOutputs,
      totalCost: generatedTransaction.totalCost,
      miningData: generatedTransaction.miningData,
      spendableOutputs: updatedSpendableOutputs,
      challengeTxid: challengeTxid,
      challengeVout: challengeVout,
      challengeUtxo: challengeUtxo,
      step1Locked: true,
      step2Locked: true,
      status: 'broadcast',
      timestamp: Date.now()
    };

    TurbominingModule.save(transactionData);
    
    

    return broadcastResult;
  }
}
