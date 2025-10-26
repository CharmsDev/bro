/**
 * useTurbomintingState - Manage turbominting state and data loading
 */
import { useState, useEffect } from 'react';
import TurbominingModule from '../../../../modules/turbomining/TurbominingModule.js';
import TurbomintingService from '../../../../services/turbominting/TurbomintingService.js';

export function useTurbomintingState(setShouldPlaySoundOnInteraction) {
  const [turbominingData, setTurbominingData] = useState(null);
  const [miningReady, setMiningReady] = useState(false);
  const [fundingReady, setFundingReady] = useState(false);
  const [error, setError] = useState(null);
  const [confirmationInfo, setConfirmationInfo] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load turbomining data from Step 3
        const turbominingData = TurbominingModule.load();
        
        // Validate: needs either miningData OR miningTxid (if already broadcast)
        const hasMiningData = turbominingData?.miningData;
        const hasBroadcast = turbominingData?.miningTxid;
        const hasSpendableOutputs = turbominingData?.spendableOutputs?.length > 0;
        
        if ((!hasMiningData && !hasBroadcast) || !hasSpendableOutputs) {
          setError('No turbomining data found. Please complete Step 3 (Turbomining) first.');
          return;
        }

        // Load persisted turbominting state
        const savedState = TurbomintingService.load();
        
        // Merge turbomining data with saved state
        const mergedData = {
          ...turbominingData,
          ...savedState,
          numberOfOutputs: turbominingData.numberOfOutputs || turbominingData.spendableOutputs?.length
        };

        setTurbominingData(mergedData);
        
        // Restore confirmation state
        if (mergedData.miningTxConfirmed) {
          setConfirmationInfo(mergedData.confirmationInfo);
          
          // Signal that sound should play on first user interaction
          // This allows users to hear the sound when refreshing the page
          if (setShouldPlaySoundOnInteraction) {
            setShouldPlaySoundOnInteraction(true);
          }
        }

        // Restore or set readiness flags
        if (mergedData.miningTxConfirmed && mergedData.miningReady !== true) {
          setMiningReady(true);
          TurbomintingService.setMiningReady(true);
        } else {
          setMiningReady(mergedData.miningReady === true);
        }

        if (mergedData.fundingTxid && mergedData.fundingReady !== true) {
          setFundingReady(true);
          TurbomintingService.setFundingReady(true);
        } else {
          setFundingReady(mergedData.fundingReady === true);
        }

        // Minting progress is initialized after funding analysis completes
        // (see index.jsx POINT 1 and POINT 2)
        
      } catch (error) {
        setError(`Failed to load data: ${error.message}`);
      }
    };
    
    loadData();
  }, []);

  return {
    turbominingData,
    setTurbominingData,
    miningReady,
    setMiningReady,
    fundingReady,
    setFundingReady,
    error,
    confirmationInfo,
    setConfirmationInfo
  };
}
