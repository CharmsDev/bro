import { useState, useEffect, useRef } from 'react';
import BitcoinApiRouter from '../services/providers/bitcoin-api-router/index.js';

export function useConfirmationMonitor(txid, shouldMonitor = true) {
  const [confirmations, setConfirmations] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  // Use ref to track current monitoring txid to prevent restarts
  const monitoringTxidRef = useRef(null);

  useEffect(() => {
    // If already monitoring this txid, don't restart
    if (monitoringTxidRef.current === txid && isMonitoring) {
      return;
    }
    
    if (!txid || !shouldMonitor) {
      setIsMonitoring(false);
      monitoringTxidRef.current = null;
      return;
    }

    let intervalId;
    let isMounted = true;
    setIsMonitoring(true);
    monitoringTxidRef.current = txid;

    const checkConfirmations = async () => {
      if (!isMounted) return;
      
      try {
        const client = new BitcoinApiRouter();
        const txData = await client.getRawTransaction(txid, true);
        
        if (!isMounted) return;
        
        if (txData && txData.confirmations !== undefined) {
          setConfirmations(txData.confirmations);
          
          if (txData.confirmations >= 1) {
            setIsConfirmed(true);
            setIsMonitoring(false);
            monitoringTxidRef.current = null;
            if (intervalId) {
              clearInterval(intervalId);
            }
          }
        }
      } catch (error) {
        // Silently handle errors to avoid spam
      }
    };

    checkConfirmations();
    intervalId = setInterval(checkConfirmations, 30000); // 30 seconds

    return () => {
      isMounted = false;
      setIsMonitoring(false);
      monitoringTxidRef.current = null;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [txid, shouldMonitor]);

  return { confirmations, isMonitoring, isConfirmed };
}
