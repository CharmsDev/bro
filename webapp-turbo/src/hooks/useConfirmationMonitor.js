import { useState, useEffect, useRef, useCallback } from 'react';
import BitcoinApiRouter from '../services/providers/bitcoin-api-router/index.js';

// Grace period allows TX to propagate through network before considering it missing
const GRACE_PERIOD_MS = 180000;
const POLLING_INTERVAL_MS = 30000;
const MIN_CONFIRMATIONS = 1;
const TX_NOT_FOUND_PATTERNS = ['404', 'not found', 'No such mempool'];

// Check if error indicates transaction not found
const isTxNotFoundError = (error) => {
  if (!error?.message) return false;
  return TX_NOT_FOUND_PATTERNS.some(pattern => 
    error.message.includes(pattern)
  );
};

// Calculate remaining time in grace period
const getRemainingGracePeriod = (startTime) => {
  const elapsed = Date.now() - startTime;
  return Math.max(0, GRACE_PERIOD_MS - elapsed);
};

export function useConfirmationMonitor(txid, shouldMonitor = true) {
  const [confirmations, setConfirmations] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  const monitoringTxidRef = useRef(null);
  const monitoringStartTimeRef = useRef(null);
  const intervalIdRef = useRef(null);

  // Stop monitoring and cleanup resources
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    monitoringTxidRef.current = null;
    monitoringStartTimeRef.current = null;
    
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  // Handle TX not found with grace period logic
  const handleTxNotFound = useCallback((txid) => {
    const remaining = getRemainingGracePeriod(monitoringStartTimeRef.current);
    
    if (remaining > 0) {
      const remainingMinutes = Math.ceil(remaining / 60000);
      console.log(
        `[ConfirmationMonitor] TX ${txid.slice(0, 12)}... not found yet. ` +
        `Grace period: ${remainingMinutes}m remaining`
      );
      return false;
    }
    
    console.warn(
      `[ConfirmationMonitor] TX ${txid.slice(0, 12)}... not found after ` +
      `${GRACE_PERIOD_MS / 60000} minutes. Stopping monitor.`
    );
    return true;
  }, []);

  // Poll transaction confirmations from blockchain
  const checkConfirmations = useCallback(async (txid, isMountedRef) => {
    if (!isMountedRef.current) return;
    
    try {
      const client = new BitcoinApiRouter();
      const txData = await client.getRawTransaction(txid, true);
      
      if (!isMountedRef.current || !txData) return;
      
      const txConfirmations = txData.confirmations ?? 0;
      setConfirmations(txConfirmations);
      
      if (txConfirmations >= MIN_CONFIRMATIONS) {
        setIsConfirmed(true);
        stopMonitoring();
      }
    } catch (error) {
      if (!isTxNotFoundError(error)) {
        console.error('[ConfirmationMonitor] Unexpected error:', error.message);
        return;
      }
      
      const shouldStop = handleTxNotFound(txid);
      if (shouldStop) {
        stopMonitoring();
      }
    }
  }, [stopMonitoring, handleTxNotFound]);

  useEffect(() => {
    // Prevent restart if already monitoring same txid
    if (monitoringTxidRef.current === txid && isMonitoring) return;
    
    if (!txid || !shouldMonitor) {
      stopMonitoring();
      return;
    }

    // Initialize monitoring session
    const isMountedRef = { current: true };
    setIsMonitoring(true);
    monitoringTxidRef.current = txid;
    monitoringStartTimeRef.current = Date.now();

    // Start polling
    checkConfirmations(txid, isMountedRef);
    intervalIdRef.current = setInterval(
      () => checkConfirmations(txid, isMountedRef),
      POLLING_INTERVAL_MS
    );

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      stopMonitoring();
    };
  }, [txid, shouldMonitor, checkConfirmations, stopMonitoring]);

  return { confirmations, isMonitoring, isConfirmed };
}
