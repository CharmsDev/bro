/**
 * useMiningBroadcast - Handle mining transaction broadcast and monitoring
 */
import { useState, useEffect } from 'react';
import { useConfirmationMonitor } from '../../../../hooks/useConfirmationMonitor.js';
import TurbomintingService from '../../../../services/turbominting/TurbomintingService.js';

export function useMiningBroadcast(turbominingData, setMiningReady, setConfirmationInfo) {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastError, setBroadcastError] = useState(null);
  
  // Use confirmation monitor hook
  const shouldMonitor = turbominingData?.miningTxid && !turbominingData?.miningTxConfirmed;
  const { confirmations, isMonitoring, isConfirmed } = useConfirmationMonitor(
    turbominingData?.miningTxid,
    shouldMonitor
  );

  // Auto-broadcast mining transaction on load
  useEffect(() => {
    if (!turbominingData?.signedTxHex || turbominingData.miningTxid || isBroadcasting) {
      return;
    }

    const broadcastMiningTx = async () => {
      setIsBroadcasting(true);
      try {
        const result = await TurbomintingService.broadcastMiningTransaction(turbominingData.signedTxHex);
        
        if (result.success && result.txid) {
          setBroadcastError(null);
          // Monitoring will start automatically via useConfirmationMonitor hook
        } else {
          setBroadcastError(result.error || 'Broadcast failed');
        }
      } catch (error) {
        setBroadcastError(error.message);
      } finally {
        setIsBroadcasting(false);
      }
    };

    broadcastMiningTx();
  }, [turbominingData, isBroadcasting]);

  // Handle confirmation
  useEffect(() => {
    if (isConfirmed && confirmations >= 1) {
      const info = {
        confirmed: true,
        confirmations: confirmations
      };
      setConfirmationInfo(info);
      setMiningReady(true);
      TurbomintingService.setMiningConfirmed(info);
    }
  }, [isConfirmed, confirmations]);

  return {
    isBroadcasting,
    broadcastError,
    isMonitoring
  };
}
