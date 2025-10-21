// Custom Hook for Minting Loop State Management
import { useState, useCallback, useEffect } from 'react';
import TurbomintingService from '../../../../../services/turbominting/TurbomintingService.js';
import { OUTPUT_STATUS, SUB_STEPS } from './constants.js';

export function useMintingLoop(numberOfOutputs) {
  const [outputsProgress, setOutputsProgress] = useState([]);
  const [currentOutputIndex, setCurrentOutputIndex] = useState(null);
  const [lastProcessedIndex, setLastProcessedIndex] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize or load progress from storage
  useEffect(() => {
    const savedState = TurbomintingService.load();
    
    if (savedState?.mintingProgress?.outputs) {
      // Restore from storage
      setOutputsProgress(savedState.mintingProgress.outputs);
      
      // Find last incomplete output to resume
      const lastIncomplete = savedState.mintingProgress.outputs.findIndex(
        o => o.status === OUTPUT_STATUS.PROCESSING || o.status === OUTPUT_STATUS.PENDING || o.status === OUTPUT_STATUS.READY
      );
      
      if (lastIncomplete !== -1 && savedState.mintingProgress.outputs[lastIncomplete].status === OUTPUT_STATUS.PROCESSING) {
        setCurrentOutputIndex(lastIncomplete);
      }
    } else if (numberOfOutputs > 0) {
      // Initialize fresh - outputs start as READY (orange) when funding is ready
      const initialProgress = Array.from({ length: numberOfOutputs }, (_, i) => ({
        index: i,
        status: OUTPUT_STATUS.READY, // Changed from PENDING to READY
        currentSubStep: null,
        miningUtxo: null,  // { txid, vout, amount } - set when starting
        fundingUtxo: null, // { txid, vout, amount } - set when starting
        commitTxid: null,  // Set after broadcast
        spellTxid: null,   // Set after broadcast
        error: null,
        createdAt: Date.now()
      }));
      
      setOutputsProgress(initialProgress);
      TurbomintingService.initializeMintingProgress(numberOfOutputs);
    }
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

  // Reset all progress
  const resetProgress = useCallback(() => {
    const resetProgress = outputsProgress.map(o => ({
      ...o,
      status: OUTPUT_STATUS.PENDING,
      currentSubStep: null,
      commitTxid: null,
      spellTxid: null,
      error: null
    }));
    
    setOutputsProgress(resetProgress);
    setCurrentOutputIndex(null);
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
