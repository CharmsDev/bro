/**
 * useOutputProcessor - Hook for processing outputs sequentially
 * Handles validation, error handling, and sequential processing logic
 */

import { useCallback } from 'react';
import { OutputProcessor } from '../services/OutputProcessor.js';

export function useOutputProcessor({
  turbominingData,
  walletAddress,
  outputsProgress,
  startOutput,
  completeOutput,
  failOutput,
  updateSubStep,
  updateOutputProgress,
  onComplete
}) {
  const processOutput = useCallback(async (outputIndex) => {
    // Use pre-defined total from mintingProgress (outputsProgress.length)
    // This was already calculated and validated in previous steps
    const totalOutputs = outputsProgress.length;
    
    if (outputIndex >= totalOutputs) {
      if (onComplete) onComplete();
      return;
    }
      
    const spendableOutput = turbominingData.spendableOutputs[outputIndex];
    const fundingUtxo = fundingAnalysis?.resultingUtxos?.[outputIndex];

    if (!spendableOutput) {
      const error = new Error('Output not found');
      failOutput(outputIndex, error);
      
      const nextIndex = outputIndex + 1;
      if (nextIndex < totalOutputs) {
        setTimeout(() => processOutput(nextIndex), 2000);
      } else {
        if (onComplete) onComplete();
      }
      return;
    }

    if (!fundingUtxo || !fundingUtxo.txid) {
      const error = new Error(`Funding UTXO ${outputIndex} is missing or invalid. Cannot process output.`);
      failOutput(outputIndex, error);
      if (onComplete) onComplete();
      return;
    }

    try {
      startOutput(outputIndex);

      const outputData = outputsProgress[outputIndex];

      const result = await OutputProcessor.processOutput({
        outputIndex,
        spendableOutput,
        fundingUtxo,
        turbominingData,
        walletAddress,
        updateSubStep,
        updateOutputProgress,
        outputData
      });
      
      completeOutput(outputIndex, result);
      
      const nextIndex = outputIndex + 1;
      
      if (nextIndex < totalOutputs) {
        setTimeout(() => processOutput(nextIndex), 1000);
      } else {
        if (onComplete) onComplete();
      }

    } catch (error) {
      failOutput(outputIndex, error);
      
      const nextIndex = outputIndex + 1;
      
      if (nextIndex < totalOutputs) {
        setTimeout(() => processOutput(nextIndex), 2000);
      } else {
        if (onComplete) onComplete();
      }
    }
  }, [
    turbominingData,
    walletAddress,
    outputsProgress,
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
