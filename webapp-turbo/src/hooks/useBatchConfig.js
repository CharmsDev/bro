// useBatchConfig hook - React hook for batch configuration management
import { useCallback, useRef } from 'react';
import { useStore } from '../store/index.js';
import { BATCH_SIZES, FUNDING_STATUS, validateBatchSize } from '../constants/batch.js';

export function useBatchConfig() {
  const { 
    batch,
    setBatchQuantity,
    setUtxos,
    setSelectedUtxos,
    setMonitoring,
    setFundingStatus,
    isBatchReady,
    getMaxPossibleMints,
    getFundingShortfall,
    selectOptimalUtxos,
    resetBatch,
    setProcessing,
    setError,
    clearError
  } = useStore();
  
  const monitoringStopRef = useRef(null);

  const updateBatchSize = useCallback((quantity) => {
    clearError();
    
    const validation = validateBatchSize(quantity);
    if (!validation.valid) {
      setError(validation.error);
      return false;
    }
    
    setBatchQuantity(parseInt(quantity));
    return true;
  }, [setBatchQuantity, setError, clearError]);

  const startUtxoMonitoring = useCallback(async (walletAddress) => {
    if (!walletAddress) {
      setError('Wallet address is required for UTXO monitoring');
      return;
    }

    setMonitoring(true);
    setFundingStatus(FUNDING_STATUS.MONITORING);
    clearError();
    
    try {
      const { UtxoMonitorService } = await import('../services/utxo/UtxoMonitorService.js');
      const apiService = new UtxoMonitorService();
      
      
      // Start monitoring with callbacks
      const stopMonitoring = await apiService.monitorAddress(
        walletAddress,
        // onUtxoFound callback
        (utxos) => {
          setUtxos(utxos);
          
          // Check if we have sufficient funds
          const totalFunds = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
          if (totalFunds >= batch.requiredFunds) {
            setMonitoring(false);
            selectOptimalUtxos();
          }
        },
        // onStatusUpdate callback
        (status) => {
        },
        // onError callback
        (error) => {
          setError(error.message);
          setMonitoring(false);
          setFundingStatus(FUNDING_STATUS.ERROR);
        }
      );
      
      monitoringStopRef.current = stopMonitoring;
      
    } catch (error) {
      setError(error.message);
      setMonitoring(false);
      setFundingStatus(FUNDING_STATUS.ERROR);
    }
  }, [setMonitoring, setFundingStatus, setUtxos, selectOptimalUtxos, setError, clearError, batch.requiredFunds]);

  const stopUtxoMonitoring = useCallback(() => {
    if (monitoringStopRef.current) {
      monitoringStopRef.current();
      monitoringStopRef.current = null;
    }
    
    setMonitoring(false);
    const status = batch.availableFunds >= batch.requiredFunds 
      ? FUNDING_STATUS.SUFFICIENT 
      : FUNDING_STATUS.INSUFFICIENT;
    setFundingStatus(status);
  }, [setMonitoring, setFundingStatus, batch.availableFunds, batch.requiredFunds]);

  const selectCustomUtxos = useCallback((selectedUtxoIds) => {
    const selectedUtxos = batch.utxos.filter(utxo => 
      selectedUtxoIds.includes(`${utxo.txid}:${utxo.vout}`)
    );
    
    setSelectedUtxos(selectedUtxos);
  }, [batch.utxos, setSelectedUtxos]);

  const getRecommendedBatchSize = useCallback(() => {
    const maxPossible = getMaxPossibleMints();
    
    // Find the largest predefined batch size that fits
    const recommendedSize = BATCH_SIZES
      .filter(size => size <= maxPossible)
      .pop() || 1;
    
    return recommendedSize;
  }, [getMaxPossibleMints]);

  return {
    batch,
    batchSizes: BATCH_SIZES,
    fundingStatus: FUNDING_STATUS,
    isReady: isBatchReady(),
    maxPossibleMints: getMaxPossibleMints(),
    fundingShortfall: getFundingShortfall(),
    recommendedBatchSize: getRecommendedBatchSize(),
    updateBatchSize,
    startUtxoMonitoring,
    stopUtxoMonitoring,
    selectCustomUtxos,
    selectOptimalUtxos,
    resetBatch
  };
}
