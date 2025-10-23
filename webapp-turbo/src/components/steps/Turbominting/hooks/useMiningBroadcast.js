/**
 * useMiningBroadcast - Handle mining transaction broadcast and monitoring
 */
import { useState, useEffect, useRef } from 'react';
import { useConfirmationMonitor } from '../../../../hooks/useConfirmationMonitor.js';
import TurbomintingService from '../../../../services/turbominting/TurbomintingService.js';
import { getSoundEffects } from '../utils/soundEffects.js';

export function useMiningBroadcast(turbominingData, setMiningReady, setConfirmationInfo, setTurbominingData) {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastError, setBroadcastError] = useState(null);
  const soundPlayedRef = useRef(false);
  const broadcastAttemptedRef = useRef(false); // Track if we already tried broadcasting
  
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
    if (!turbominingData?.signedTxHex || turbominingData.miningTxid || isBroadcasting || broadcastAttemptedRef.current) {
      return;
    }

    broadcastAttemptedRef.current = true;

    const broadcastMiningTx = async () => {
      setIsBroadcasting(true);
      
      try {
        const result = await TurbomintingService.broadcastMiningTransaction(turbominingData.signedTxHex);
        
        if (result.success && result.txid) {
          setBroadcastError(null);
          
          if (setTurbominingData) {
            setTurbominingData(prev => ({
              ...prev,
              miningTxid: result.txid,
              explorerUrl: result.explorerUrl,
              miningTxConfirmed: false,
              miningReady: false
            }));
          }
        } else {
          if (!result.txid) {
            setBroadcastError(result.error || 'Broadcast failed');
            broadcastAttemptedRef.current = false;
          } else {
            setBroadcastError(null);
            
            if (setTurbominingData) {
              setTurbominingData(prev => ({
                ...prev,
                miningTxid: result.txid,
                explorerUrl: result.explorerUrl,
                miningTxConfirmed: false,
                miningReady: false
              }));
            }
          }
        }
      } catch (error) {
        console.error('Broadcast error:', error.message);
        setBroadcastError(error.message);
        broadcastAttemptedRef.current = false;
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
      
      // CRITICAL: Update local state to reflect confirmation
      setTurbominingData(prev => ({
        ...prev,
        miningTxConfirmed: true,
        confirmations: confirmations
      }));
      
      // Play confirmation sound (only once)
      if (!soundPlayedRef.current) {
        soundPlayedRef.current = true;
        const soundEffects = getSoundEffects();
        soundEffects.playConfirmationSound();
      }
    }
  }, [isConfirmed, confirmations, setTurbominingData]);

  return {
    isBroadcasting,
    broadcastError,
    isMonitoring
  };
}
