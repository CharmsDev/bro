/**
 * useMiningBroadcast - Handle mining transaction broadcast and monitoring
 */
import { useState, useEffect, useRef } from 'react';
import { useConfirmationMonitor } from '../../../../hooks/useConfirmationMonitor.js';
import TurbomintingService from '../../../../services/turbominting/TurbomintingService.js';
import { getSoundEffects } from '../utils/soundEffects.js';

export function useMiningBroadcast(turbominingData, setMiningReady, setConfirmationInfo) {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastError, setBroadcastError] = useState(null);
  const soundPlayedRef = useRef(false);
  
  // Extract stable values to prevent unnecessary re-renders
  const miningTxid = turbominingData?.miningTxid;
  const miningTxConfirmed = turbominingData?.miningTxConfirmed;
  
  // Use confirmation monitor hook - only monitor if we have txid and it's not confirmed
  const shouldMonitor = Boolean(miningTxid && !miningTxConfirmed);
  const { confirmations, isMonitoring, isConfirmed } = useConfirmationMonitor(
    miningTxid,
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
      
      // Play confirmation sound (only once)
      if (!soundPlayedRef.current) {
        soundPlayedRef.current = true;
        const soundEffects = getSoundEffects();
        soundEffects.playConfirmationSound();
      }
    }
  }, [isConfirmed, confirmations]);

  return {
    isBroadcasting,
    broadcastError,
    isMonitoring
  };
}
