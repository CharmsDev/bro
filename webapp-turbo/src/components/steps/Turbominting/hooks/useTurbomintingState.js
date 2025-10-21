/**
 * useTurbomintingState - Manage turbominting state and data loading
 */
import { useState, useEffect } from 'react';
import TurbominingModule from '../../../../modules/turbomining/TurbominingModule.js';
import TurbomintingService from '../../../../services/turbominting/TurbomintingService.js';

export function useTurbomintingState() {
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
        if (!turbominingData?.miningData || !turbominingData?.spendableOutputs?.length) {
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

        // Initialize minting progress if not exists
        if (!savedState?.mintingProgress && mergedData.numberOfOutputs) {
          TurbomintingService.initializeMintingProgress(mergedData.numberOfOutputs);
        }
        
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
