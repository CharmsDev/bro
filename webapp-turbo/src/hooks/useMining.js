// useMining hook - Simplified for webapp-turbo with routing
import { useCallback, useRef, useEffect } from 'react';
import { useStore } from '../store/index.js';
import { useNavigate } from 'react-router-dom';
import { MiningOrchestrator } from '../services/mining/MiningOrchestrator.js';
import CentralStorage from '../storage/CentralStorage.js';
import { formatHashRate } from '../utils/formatters.js';

export function useMining() {
  const navigate = useNavigate();
  const {
    mining,
    batch,
    setMiningMode,
    setMiningActive,
    updateMiningProgress,
    setBestHash,
    setMiningChallenge,
    setMiningStatus,
    setMiningResult,
    setError,
    clearError,
    loadMiningData,
    saveMiningData,
    canStartMining,
    setProcessing
  } = useStore();

  const miningOrchestratorRef = useRef(null);

  useEffect(() => {
    loadMiningData();
  }, [loadMiningData]);

  const startMining = useCallback(async () => {
    if (!batch.selectedUtxos || batch.selectedUtxos.length === 0) {
      setError('No UTXOs selected for mining');
      return;
    }

    // CRITICAL: Check if mining is locked - prevent re-mining
    const { default: MiningModule } = await import('../modules/mining/MiningModule.js');
    const lockStatus = MiningModule.getLockStatus();
    
    if (lockStatus.isLocked) {
      setError(lockStatus.message || 'Mining transaction already broadcast. Cannot re-mine.');
      return;
    }

    clearError();
    setProcessing(true);

    try {
      // Initialize Orchestrator
      if (!miningOrchestratorRef.current) {
        miningOrchestratorRef.current = new MiningOrchestrator();
        
        // Sync mode: orchestrator may have loaded mode from localStorage
        const orchestratorMode = miningOrchestratorRef.current.mode;
        if (orchestratorMode !== mining.mode) {
          setMiningMode(orchestratorMode);
        }
      }
      
      const selectedUtxo = batch.selectedUtxos[0];
      
      // CRITICAL: Only set challenge if not already set from saved data
      if (!mining.challenge || !savedData?.challengeUtxo) {
        setMiningChallenge(selectedUtxo);
      } else {
      }
      
      setMiningActive(true);
      setMiningStatus('mining', `Mining with ${mining.mode.toUpperCase()}...`);

      // Start REAL mining with MiningOrchestrator
      await miningOrchestratorRef.current.startMining(selectedUtxo, {
        onProgressUpdate: (progress) => {
          updateMiningProgress({
            currentNonce: progress.currentNonce,
            hashRate: progress.hashRate || 0,
            elapsed: Date.now() - (mining.startTime || Date.now())
          });
        },
        onBestHashUpdate: (bestResult) => {
          setBestHash({
            hash: bestResult.hash,
            nonce: bestResult.nonce,
            leadingZeros: bestResult.leadingZeros,
            rewardInfo: bestResult.rewardInfo
          });
        },
        onStatusUpdate: (status) => {
          setMiningStatus(status.status, status.message);
        }
      });

    } catch (error) {
      setError(error.message);
      setMiningActive(false);
      setMiningStatus('error', error.message, error);
    } finally {
      setProcessing(false);
    }
  }, [
    batch.selectedUtxos, mining.mode, mining.currentNonce, mining.bestLeadingZeros, 
    mining.bestHash, mining.bestNonce, mining.startTime, clearError, setProcessing, 
    setError, setMiningChallenge, setMiningActive, setMiningStatus, updateMiningProgress, setBestHash
  ]);

  const stopMining = useCallback(async () => {
    if (miningOrchestratorRef.current) {
      // Stop mining - wait for it to finish and save
      await miningOrchestratorRef.current.stopMining();
    }

    setMiningActive(false);
    setMiningStatus('stopped', 'Mining stopped');
    saveMiningData();
    
    return null;
  }, [setMiningActive, setMiningStatus, saveMiningData]);

  const changeMiningMode = useCallback((mode) => {
    if (mining.isActive) {
      return false;
    }

    if (mode !== 'cpu' && mode !== 'gpu') {
      return false;
    }

    setMiningMode(mode);
    
    const existing = CentralStorage.get('mining') || {};
    CentralStorage.set('mining', {
      ...existing,
      progress: {
        ...(existing.progress || {}),
        mode: mode,
        timestamp: Date.now()
      }
    });

    return true;
  }, [mining.isActive, setMiningMode]);

  const proceedToNextStep = useCallback(() => {
    if (!mining.hasResult || !mining.result) {
      setError('No mining result available. Please complete mining first.');
      return;
    }

    saveMiningData();
    navigate('/turbomining');
  }, [mining.hasResult, mining.result, setError, saveMiningData, navigate]);

  return {
    mining,
    startMining,
    stopMining,
    changeMiningMode,
    proceedToNextStep,
    formatHashRate
  };
}
