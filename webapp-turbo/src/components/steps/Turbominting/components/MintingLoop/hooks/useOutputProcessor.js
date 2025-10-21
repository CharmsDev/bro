/**
 * useOutputProcessor - Hook for processing outputs sequentially
 * Handles validation, error handling, and sequential processing logic
 */

import { useCallback } from 'react';
import { OutputProcessor } from '../services/OutputProcessor.js';

export function useOutputProcessor({
  turbominingData,
  fundingAnalysis,
  walletAddress,
  startOutput,
  completeOutput,
  failOutput,
  updateSubStep,
  updateOutputProgress,
  onComplete
}) {
  /**
   * Process a single output through all sub-steps
   * Handles validation, processing, and continuation to next output
   */
  const processOutput = useCallback(async (outputIndex) => {
    const maxAffordable = fundingAnalysis?.resultingUtxos?.length || fundingAnalysis?.currentOutputs || 0;
    
    if (outputIndex >= maxAffordable) {
      if (onComplete) onComplete();
      return;
    }
      
    const spendableOutput = turbominingData.spendableOutputs[outputIndex];
    const fundingUtxo = fundingAnalysis?.resultingUtxos?.[outputIndex];

    if (!spendableOutput) {
      const error = new Error('Output not found');
      failOutput(outputIndex, error);
      
      const nextIndex = outputIndex + 1;
      if (nextIndex < turbominingData.numberOfOutputs) {
        setTimeout(() => processOutput(nextIndex), 2000);
      } else {
        if (onComplete) onComplete();
      }
      return;
    }

    if (!fundingUtxo) {
      if (onComplete) onComplete();
      return;
    }

    try {
      startOutput(outputIndex);

      const result = await OutputProcessor.processOutput({
        outputIndex,
        spendableOutput,
        fundingUtxo,
        turbominingData,
        walletAddress,
        updateSubStep,
        updateOutputProgress
      });
      
      completeOutput(outputIndex, result);
      
      const nextIndex = outputIndex + 1;
      const maxAffordable = fundingAnalysis?.resultingUtxos?.length || fundingAnalysis?.currentOutputs || turbominingData.numberOfOutputs;
      
      if (nextIndex < maxAffordable) {
        setTimeout(() => processOutput(nextIndex), 1000);
      } else {
        if (onComplete) onComplete();
      }

    } catch (error) {
      failOutput(outputIndex, error);
      
      const nextIndex = outputIndex + 1;
      const maxAffordable = fundingAnalysis?.canAfford || fundingAnalysis?.utxosToUse?.length || turbominingData.numberOfOutputs;
      
      if (nextIndex < maxAffordable) {
        setTimeout(() => processOutput(nextIndex), 2000);
      } else {
        if (onComplete) onComplete();
      }
    }
  }, [
    turbominingData,
    fundingAnalysis,
    walletAddress,
    startOutput,
    completeOutput,
    failOutput,
    updateSubStep,
    updateOutputProgress,
    onComplete
  ]);

  return {
    processOutput
  };
}
