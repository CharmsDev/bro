/**
 * useMiningBroadcast - Handle mining transaction broadcast and monitoring
 */
import { useState, useEffect } from 'react';
import TurbomintingService from '../../../../services/turbominting/TurbomintingService.js';

export function useMiningBroadcast(turbominingData, setMiningReady, setConfirmationInfo) {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastError, setBroadcastError] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

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
          
          // Start monitoring confirmations
          startMonitoring(result.txid);
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

  const startMonitoring = (txid) => {
    setIsMonitoring(true);
    
    TurbomintingService.monitorMiningConfirmation(
      txid,
      (info) => {
        setConfirmationInfo(info);
        setMiningReady(true);
        setIsMonitoring(false);
      },
      (error) => {
        setBroadcastError(`Monitoring error: ${error.message}`);
        setIsMonitoring(false);
      }
    );
  };

  return {
    isBroadcasting,
    broadcastError,
    isMonitoring
  };
}
