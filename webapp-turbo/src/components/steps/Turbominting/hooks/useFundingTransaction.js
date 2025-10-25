import { useState, useCallback, useEffect } from 'react';
import { FundingTxBuilder } from '../services/funding-tx-builder.js';
import { WalletUtxoScanner } from '../../../../services/utxo/WalletUtxoScanner.js';
import { WalletStorage } from '../../../../storage/index.js';
import TurbomintingService from '../../../../services/turbominting/TurbomintingService.js';
import { MINTING_UTXO_VALUE } from '../../../../constants/minting.js';

export function useFundingTransaction(requiredOutputs) {
  const [fundingState, setFundingState] = useState({
    isAnalyzing: false,
    isCreating: false,
    needsFunding: null,
    analysis: null,
    transaction: null,
    error: null
  });
  // Load saved data on mount
  useEffect(() => {
    const savedData = TurbomintingService.load();
    
    if (savedData?.fundingBroadcasted === true) {
      const savedTransaction = TurbomintingService.getFundingTransaction();
      
      if (savedTransaction) {
        
        setFundingState(prev => ({
          ...prev,
          transaction: savedTransaction,
          needsFunding: false
        }));
      }
      
      return;
    }
  }, [requiredOutputs]);

  const createFundingTransaction = useCallback(async () => {
    if (!fundingState.analysis || !fundingState.availableUtxos) {
      throw new Error('Must analyze funding needs first');
    }

    setFundingState(prev => ({ ...prev, isCreating: true, error: null }));

    try {
      const extendedAddresses = WalletStorage.loadExtendedAddresses();
      const walletKeys = extendedAddresses?.recipient?.[0];
      
      if (!walletKeys) {
        throw new Error('Wallet keys not found in storage');
      }

      const walletData = WalletStorage.load();
      const walletAddress = walletKeys.address || walletData?.address;
      
      if (!walletAddress) {
        throw new Error('Wallet address not found in storage');
      }

      const builder = new FundingTxBuilder();
      const result = await builder.buildAndSignFundingTx(
        fundingState.analysis,
        walletAddress,
        walletKeys
      );

      // Update resultingUtxos with actual funding transaction outputs
      const resultingUtxos = result.outputs?.map((output, vout) => ({
        ...output,
        txid: result.txid,
        vout,
        source: 'funding_tx'
      })) || [];

      setFundingState(prev => ({
        ...prev,
        isCreating: false,
        transaction: result,
        resultingUtxos
      }));

      return result;
    } catch (error) {
      setFundingState(prev => ({
        ...prev,
        isCreating: false,
        error: error.message
      }));
      throw error;
    }
  }, [fundingState.analysis, fundingState.availableUtxos, requiredOutputs]);

  const setAnalysis = useCallback((analysis, availableUtxos, resultingUtxos) => {
    setFundingState(prev => {
      const utxosChanged = prev.availableUtxos?.length !== availableUtxos?.length;
      const needsFunding = analysis?.strategy !== 'sufficient_utxos';
      
      return {
        ...prev,
        analysis,
        availableUtxos,
        resultingUtxos,
        needsFunding,
        transaction: utxosChanged ? null : prev.transaction
      };
    });
  }, []);

  const reset = useCallback(() => {
    setFundingState({
      isAnalyzing: false,
      isCreating: false,
      needsFunding: null,
      analysis: null,
      transaction: null,
      error: null
    });
  }, []);

  return {
    ...fundingState,
    createFundingTransaction,
    setAnalysis,
    reset
  };
}
