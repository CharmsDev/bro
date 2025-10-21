import { useState, useEffect } from 'react';
import BitcoinApiRouter from '../services/providers/bitcoin-api-router/index.js';

export function useConfirmationMonitor(txid, shouldMonitor = true) {
  const [confirmations, setConfirmations] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (!txid || !shouldMonitor) {
      setIsMonitoring(false);
      return;
    }

    let intervalId;
    let isMounted = true;
    setIsMonitoring(true);

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
            if (intervalId) {
              clearInterval(intervalId);
            }
          }
        }
      } catch (error) {
      }
    };

    checkConfirmations();
    intervalId = setInterval(checkConfirmations, 30000);

    return () => {
      isMounted = false;
      setIsMonitoring(false);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [txid, shouldMonitor]);

  return { confirmations, isMonitoring, isConfirmed };
}
