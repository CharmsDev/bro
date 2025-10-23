// useUtxoMonitor hook - React hook for UTXO monitoring
import { useCallback, useRef, useEffect, useState } from 'react';
import { useStore } from '../store/index.js';
import { UtxoMonitorService } from '../services/utxo/UtxoMonitorService.js';
import CentralStorage from '../storage/CentralStorage.js';
import { TURBOMINING_CONSTANTS } from '../components/steps/Turbomining/utils/TurbominingCalculations.js';

export function useUtxoMonitor() {
  const wallet = useStore((state) => state.wallet);
  const batch = useStore((state) => state.batch);
  const setUtxos = useStore((state) => state.setUtxos);
  const selectOptimalUtxos = useStore((state) => state.selectOptimalUtxos);
  const setProcessing = useStore((state) => state.setProcessing);
  const setError = useStore((state) => state.setError);
  const clearError = useStore((state) => state.clearError);
  const batchRef = useRef(batch);
  const [monitoringStatus, setMonitoringStatus] = useState({
    isMonitoring: false,
    message: '',
    pollingCount: 0,
    foundUtxo: null
  });
  
  const monitorServiceRef = useRef(null);
  const stopMonitoringRef = useRef(null);
  const onUtxoFoundCallbackRef = useRef(null);

  // Initialize monitor service
  useEffect(() => {
    if (!monitorServiceRef.current) {
      monitorServiceRef.current = new UtxoMonitorService();
    }
  }, []);

  const startMonitoring = useCallback(async (address) => {
    
    if (!address) {
      return;
    }

    if (monitoringStatus.isMonitoring) {
      return;
    }

    clearError();
    
    setMonitoringStatus({
      isMonitoring: true,
      message: 'Starting UTXO monitoring...',
      pollingCount: 0,
      foundUtxo: null
    });

    const onUtxoFound = (utxo) => {
      setMonitoringStatus(prev => ({
        ...prev,
        isMonitoring: false,
        message: `UTXO detected! ${utxo.value} sats`,
        foundUtxo: utxo
      }));

      setUtxos([utxo]);
      selectOptimalUtxos();

      // UTXO data is now saved via batch slice in Zustand store
      // which uses CentralStorage internally
      
      // Call external callback if provided
      if (onUtxoFoundCallbackRef.current) {
        onUtxoFoundCallbackRef.current(utxo);
      }
    };

    const onStatusUpdate = (status) => {
      setMonitoringStatus(prev => ({
        ...prev,
        message: status.message,
        pollingCount: status.pollingCount
      }));
    };

    const onError = (error) => {
      setError(`UTXO monitoring failed: ${error.message}`);
      setMonitoringStatus(prev => ({
        ...prev,
        isMonitoring: false,
        message: `Error: ${error.message}`
      }));
    };

    try {
      const stopFunction = await monitorServiceRef.current.monitorAddress(
        address,
        onUtxoFound,
        onStatusUpdate,
        onError
      );

      stopMonitoringRef.current = stopFunction;
    } catch (error) {
      setError(`Failed to start monitoring: ${error.message}`);
      setMonitoringStatus(prev => ({
        ...prev,
        isMonitoring: false,
        message: `Failed to start: ${error.message}`
      }));
    }
  }, [monitoringStatus.isMonitoring, clearError, setError, setUtxos, selectOptimalUtxos]);

  const setOnUtxoFoundCallback = useCallback((callback) => {
    onUtxoFoundCallbackRef.current = callback;
  }, []);

  const stopMonitoring = useCallback(() => {
    if (stopMonitoringRef.current) {
      stopMonitoringRef.current();
      stopMonitoringRef.current = null;
    }

    setMonitoringStatus(prev => ({
      ...prev,
      isMonitoring: false,
      message: 'Monitoring stopped'
    }));
  }, []);

  // Update batch ref when it changes
  useEffect(() => {
    batchRef.current = batch;
  }, [batch]);

  // Auto-start monitoring when wallet is ready
  // BUT: Don't start if we already have UTXOs saved from a previous session
  useEffect(() => {
    const currentBatch = batchRef.current;
    const hasExistingUtxos = currentBatch?.selectedUtxos?.length > 0 || currentBatch?.utxos?.length > 0;
    
    if (wallet.address && (wallet.isGenerated || wallet.isImported) && 
        !monitoringStatus.isMonitoring && !monitoringStatus.foundUtxo && !hasExistingUtxos) {
      startMonitoring(wallet.address);
    } else if (hasExistingUtxos && !monitoringStatus.foundUtxo) {
      // Set foundUtxo from existing data
      setMonitoringStatus(prev => ({
        ...prev,
        foundUtxo: currentBatch.selectedUtxos?.[0] || currentBatch.utxos?.[0],
        message: 'UTXO loaded from storage'
      }));
    }
  }, [wallet.address, wallet.isGenerated, wallet.isImported, monitoringStatus.isMonitoring, monitoringStatus.foundUtxo, startMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stopMonitoringRef.current) {
        stopMonitoringRef.current();
      }
    };
  }, []);

  return {
    monitoringStatus,
    startMonitoring,
    stopMonitoring,
    setOnUtxoFoundCallback
  };
}
