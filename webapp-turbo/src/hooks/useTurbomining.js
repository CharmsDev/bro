// useTurbomining hook - Shared turbomining logic
import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/index.js';
import { 
  calculateTotalCost, 
  selectUtxosForCost, 
  calculateMaxAffordableOutputs,
  isOutputAffordable,
  getAvailableUtxos,
  TURBOMINING_CONSTANTS 
} from '../components/steps/Turbomining/utils/TurbominingCalculations.js';
import { WalletUtxoScanner } from '../services/utxo/WalletUtxoScanner.js';
import { TurbominingTransactionGenerator } from '../services/transaction/turbomining-transaction-generator.js';
import { TurbominingBroadcaster } from '../components/steps/Turbomining/services/TurbominingBroadcaster.js';

export function useTurbomining(miningResult, isLocked = false) {
  const { wallet } = useStore();
  
  // State
  const [selectedOutputs, setSelectedOutputs] = useState(null);
  const [walletUtxos, setWalletUtxos] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [generatedTransaction, setGeneratedTransaction] = useState(null);
  const [isGeneratingTx, setIsGeneratingTx] = useState(false);
  const [txError, setTxError] = useState(null);

  // Clear transaction when outputs selection changes
  const handleSetSelectedOutputs = useCallback((outputs) => {
    setGeneratedTransaction(null);
    setTxError(null);
    setSelectedOutputs(outputs);
  }, [selectedOutputs]);

  useEffect(() => {
    if (isLocked) {
      return;
    }
    
    if (!walletUtxos && !isScanning) {
      scanWalletUtxos();
    }
  }, [isLocked]);

  const scanWalletUtxos = useCallback(async () => {
    if (isScanning) return;
    
    setIsScanning(true);
    setScanError(null);
    setWalletUtxos(null);
    
    try {
      const scanner = new WalletUtxoScanner();
      const results = await scanner.scanAllWalletUtxos();
      
      const allUtxos = [...results.recipient, ...results.change];
      
      setWalletUtxos({
        available: allUtxos,
        totalValue: results.totalValue
      });
    } catch (error) {
      setScanError(error.message);
    } finally {
      setIsScanning(false);
    }
  }, [isScanning]);

  // Generate turbomining transaction
  const generateTurbominingTransaction = useCallback(async (numberOfOutputs) => {
    setIsGeneratingTx(true);
    setTxError(null);
    setGeneratedTransaction(null);

    try {
      const { mining, wallet: currentWallet } = useStore.getState();
      
      const generator = new TurbominingTransactionGenerator();
      
      const transactionData = await generator.generateTransaction({
        numberOfOutputs,
        miningResult,
        wallet: currentWallet,
        walletUtxos,
        miningState: {
          challengeTxid: mining.challengeTxid,
          challengeVout: mining.challengeVout
        }
      });

      setGeneratedTransaction(transactionData);
    } catch (error) {
      setTxError(error.message);
    } finally {
      setIsGeneratingTx(false);
    }
  }, [miningResult, walletUtxos]);

  // Broadcast transaction function
  const broadcastTx = useCallback(async () => {
    try {
      const broadcaster = new TurbominingBroadcaster();
      const broadcastResult = await broadcaster.broadcastTransaction(generatedTransaction);
      return broadcastResult;
    } catch (error) {
      setTxError(`Broadcast failed: ${error.message}`);
      throw error;
    }
  }, [generatedTransaction]);

  useEffect(() => {
    if (selectedOutputs && walletUtxos && walletUtxos.available?.length > 0 && miningResult && !generatedTransaction && !isGeneratingTx) {
      generateTurbominingTransaction(selectedOutputs);
    }
  }, [selectedOutputs, walletUtxos, miningResult, generatedTransaction, isGeneratingTx, generateTurbominingTransaction]);

  // Utility functions - direct access to utils
  const getMaxAffordableOutputs = useCallback(() => {
    if (!walletUtxos) return 0;
    return calculateMaxAffordableOutputs(getAvailableUtxos(walletUtxos));
  }, [walletUtxos]);

  const checkOutputAffordable = useCallback((outputs) => {
    if (!walletUtxos) return false;
    return isOutputAffordable(outputs, getAvailableUtxos(walletUtxos));
  }, [walletUtxos]);

  const getTotalCost = useCallback((outputs) => {
    return outputs * (TURBOMINING_CONSTANTS.COST_PER_OUTPUT + TURBOMINING_CONSTANTS.FEE_PER_OUTPUT);
  }, []);

  const generateTransactionJSON = useCallback(() => {
    if (!generatedTransaction) return null;
    return generatedTransaction;
  }, [generatedTransaction]);

  return {
    // State
    selectedOutputs,
    setSelectedOutputs: handleSetSelectedOutputs,
    walletUtxos,
    isScanning,
    scanError,
    generatedTransaction,
    isGeneratingTx,
    txError,

    // Actions
    scanWalletUtxos,
    generateTurbominingTransaction,
    broadcastTx,

    // Utilities
    getMaxAffordableOutputs,
    checkOutputAffordable,
    getTotalCost,
    generateTransactionJSON,

    // Constants
    outputOptions: TURBOMINING_CONSTANTS.OUTPUT_OPTIONS,
    costPerOutput: TURBOMINING_CONSTANTS.COST_PER_OUTPUT,
    feePerOutput: TURBOMINING_CONSTANTS.FEE_PER_OUTPUT,
    constants: TURBOMINING_CONSTANTS
  };
}
