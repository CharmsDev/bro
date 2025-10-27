// Custom Hook for Minting Loop State Management
import { useState, useCallback, useEffect } from 'react';
import TurbomintingService from '../../../../../services/turbominting/TurbomintingService.js';
import { OUTPUT_STATUS, SUB_STEPS } from './constants.js';

export function useMintingLoop(numberOfOutputs) {
  const [outputsProgress, setOutputsProgress] = useState([]);
  const [currentOutputIndex, setCurrentOutputIndex] = useState(null);
  const [lastProcessedIndex, setLastProcessedIndex] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Initialize or load progress from storage
  useEffect(() => {
    console.log('🔄 [MINTING LOOP] Initializing from localStorage...');
    console.log('  • numberOfOutputs dependency:', numberOfOutputs);
    
    // Small delay to ensure localStorage was updated by index.jsx
    const loadFromStorage = () => {
      const savedState = TurbomintingService.load();
      console.log('  • Saved state:', savedState ? '✅ Found' : '❌ Missing');
      console.log('  • mintingProgress:', savedState?.mintingProgress ? '✅ Found' : '❌ Missing');
      console.log('  • outputs:', savedState?.mintingProgress?.outputs?.length || 0);
      
      // Log current outputs state
      if (savedState?.mintingProgress?.outputs) {
        console.log('  • Current outputs in localStorage:');
        savedState.mintingProgress.outputs.forEach((o, i) => {
          console.log(`    Output ${i}: status=${o.status}, fundingUtxo=${o.fundingUtxo ? '✅' : '❌'}`);
        });
      }
      
      if (savedState?.mintingProgress?.outputs) {
      console.log('✅ [MINTING LOOP] Restoring from saved mintingProgress');
      
      // Check if fundingUtxos are missing and need to be repaired
      const needsRepair = savedState.mintingProgress.outputs.some(o => !o.fundingUtxo || !o.fundingUtxo.txid);
      
      if (needsRepair) {
        console.log('⚠️  [MINTING LOOP] Funding UTXOs missing - attempting repair...');
        
        // Try to get funding UTXOs from fundingAnalysis
        const fundingAnalysis = TurbomintingService.getFundingAnalysis();
        const resultingUtxos = fundingAnalysis?.resultingUtxos || [];
        
        console.log('  • Found resultingUtxos:', resultingUtxos.length);
        
        if (resultingUtxos.length > 0) {
          // Repair the outputs with funding UTXOs
          const repairedOutputs = savedState.mintingProgress.outputs.map((output, index) => ({
            ...output,
            fundingUtxo: resultingUtxos[index] ? {
              txid: resultingUtxos[index].txid,
              vout: resultingUtxos[index].vout,
              value: resultingUtxos[index].value
            } : output.fundingUtxo
          }));
          
          console.log('✅ [MINTING LOOP] Repaired outputs with funding UTXOs');
          setOutputsProgress(repairedOutputs);
          
          // Save repaired progress
          TurbomintingService.initializeMintingProgress(numberOfOutputs, resultingUtxos, true);
        } else {
          console.error('❌ [MINTING LOOP] Cannot repair - no resultingUtxos found in fundingAnalysis');
          setOutputsProgress(savedState.mintingProgress.outputs);
        }
      } else {
        console.log('✅ [MINTING LOOP] Funding UTXOs already present');
        setOutputsProgress(savedState.mintingProgress.outputs);
      }
      
      // Find last incomplete output to resume
      const lastIncomplete = savedState.mintingProgress.outputs.findIndex(
        o => o.status === OUTPUT_STATUS.PROCESSING || o.status === OUTPUT_STATUS.PENDING || o.status === OUTPUT_STATUS.READY
      );
      
      if (lastIncomplete !== -1 && savedState.mintingProgress.outputs[lastIncomplete].status === OUTPUT_STATUS.PROCESSING) {
        setCurrentOutputIndex(lastIncomplete);
      }
    } else if (numberOfOutputs > 0) {
      console.log('🆕 [MINTING LOOP] No saved progress - initializing fresh...');
      
      // Try to get funding UTXOs from fundingAnalysis
      const fundingAnalysis = TurbomintingService.getFundingAnalysis();
      const resultingUtxos = fundingAnalysis?.resultingUtxos || [];
      
      console.log('  • Found resultingUtxos:', resultingUtxos.length);
      
      // Initialize fresh - outputs start as READY (orange) when funding is ready
      const initialProgress = Array.from({ length: numberOfOutputs }, (_, i) => ({
        index: i,
        status: OUTPUT_STATUS.READY,
        currentSubStep: null,
        miningUtxo: null,
        fundingUtxo: resultingUtxos[i] ? {
          txid: resultingUtxos[i].txid,
          vout: resultingUtxos[i].vout,
          value: resultingUtxos[i].value
        } : null,
        commitTxid: null,
        spellTxid: null,
        error: null,
        createdAt: Date.now()
      }));
      
      console.log('✅ [MINTING LOOP] Initialized with funding UTXOs:', initialProgress.map(o => o.fundingUtxo));
      setOutputsProgress(initialProgress);
      TurbomintingService.initializeMintingProgress(numberOfOutputs, resultingUtxos);
    }
    };
    
    // Execute immediately
    loadFromStorage();
  }, [numberOfOutputs]);

  // Update output progress
  const updateOutputProgress = useCallback((index, updates) => {
    setOutputsProgress(prev => {
      const newProgress = [...prev];
      newProgress[index] = { ...newProgress[index], ...updates, updatedAt: Date.now() };
      
      // Save to storage
      TurbomintingService.updateMintingProgress(index, newProgress[index].status, newProgress[index]);
      
      return newProgress;
    });
  }, []);

  // Start processing an output
  const startOutput = useCallback((index) => {
    setCurrentOutputIndex(index);
    setLastProcessedIndex(index);
    setIsProcessing(true);
    updateOutputProgress(index, { 
      status: OUTPUT_STATUS.PROCESSING,
      currentSubStep: SUB_STEPS.COMPOSE_PAYLOAD
    });
  }, [updateOutputProgress]);

  // Complete an output
  const completeOutput = useCallback((index, result) => {
    updateOutputProgress(index, {
      status: OUTPUT_STATUS.COMPLETED,
      currentSubStep: SUB_STEPS.BROADCAST, // Keep last step visible
      broadcastResult: result
    });
    setCurrentOutputIndex(null);
    setLastProcessedIndex(index); // Remember last processed
    setIsProcessing(false);
  }, [updateOutputProgress]);

  // Fail an output
  const failOutput = useCallback((index, error) => {
    updateOutputProgress(index, {
      status: OUTPUT_STATUS.FAILED,
      error: error.message || String(error)
    });
    // Keep currentOutputIndex so sub-steps remain visible
    // setCurrentOutputIndex(null);
    setIsProcessing(false);
  }, [updateOutputProgress]);

  // Update sub-step
  const updateSubStep = useCallback((index, subStep, data = {}) => {
    updateOutputProgress(index, {
      currentSubStep: subStep,
      ...data
    });
  }, [updateOutputProgress]);

  const resetProgress = useCallback(() => {
    const resetProgress = outputsProgress.map(o => ({
      ...o,
      status: OUTPUT_STATUS.READY,
      currentSubStep: null,
      miningUtxo: null,
      fundingUtxo: null,
      commitTxid: null,
      spellTxid: null,
      error: null
    }));
    
    setOutputsProgress(resetProgress);
    setCurrentOutputIndex(null);
    setLastProcessedIndex(null);
    setIsProcessing(false);
    
    TurbomintingService.initializeMintingProgress(numberOfOutputs);
  }, [outputsProgress, numberOfOutputs]);

  const completedCount = outputsProgress.filter(o => o.status === OUTPUT_STATUS.COMPLETED).length;
  const failedCount = outputsProgress.filter(o => o.status === OUTPUT_STATUS.FAILED).length;

  return {
    outputsProgress,
    currentOutputIndex,
    lastProcessedIndex,
    isProcessing,
    completedCount,
    failedCount,
    startOutput,
    completeOutput,
    failOutput,
    updateSubStep,
    updateOutputProgress,
    resetProgress
  };
}
