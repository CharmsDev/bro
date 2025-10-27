/**
 * useOutputProcessor - Hook for processing outputs sequentially
 * Handles validation, error handling, and sequential processing logic
 */

import { useCallback } from 'react';
import { OutputProcessor } from '../services/OutputProcessor.js';
import TurbomintingService from '../../../../../../services/turbominting/TurbomintingService.js';

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
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`🔄 PROCESSING OUTPUT #${outputIndex}`);
    console.log('═══════════════════════════════════════════════════════');
    
    // ALWAYS read from localStorage - NO React state
    console.log('📦 Reading from localStorage (single source of truth)...');
    const savedState = TurbomintingService.load();
    
    if (!savedState?.mintingProgress?.outputs) {
      console.error('❌ No mintingProgress found in localStorage');
      if (onComplete) onComplete();
      return;
    }
    
    const outputs = savedState.mintingProgress.outputs;
    console.log('📊 Outputs from localStorage:', outputs.length);
    outputs.forEach((o, i) => {
      console.log(`  Output ${i}: status=${o.status}, fundingUtxo=${o.fundingUtxo ? '✅' : '❌'}`);
    });
    
    const totalOutputs = outputs.length;
    console.log(`📊 Total outputs: ${totalOutputs}`);
    console.log(`📊 Current output: ${outputIndex}`);
    
    if (outputIndex >= totalOutputs) {
      console.log('✅ All outputs processed - Minting complete!');
      if (onComplete) onComplete();
      return;
    }
      
    // Read output data from localStorage
    const outputData = outputs[outputIndex];
    console.log('📦 Output data:', outputData ? '✅ Found' : '❌ Missing');
    
    if (!outputData) {
      const error = new Error(`Output ${outputIndex} not found in mintingProgress`);
      console.error('❌ ERROR:', error.message);
      failOutput(outputIndex, error);
      if (onComplete) onComplete();
      return;
    }
    
    // Mining UTXO comes from turbominingData (stored separately)
    const spendableOutput = turbominingData.spendableOutputs?.[outputIndex];
    console.log('⛏️  Mining UTXO:', spendableOutput ? `✅ Found (vout: ${spendableOutput.outputIndex}, value: ${spendableOutput.value})` : '❌ Missing');
    
    // Funding UTXO comes from mintingProgress (pre-calculated)
    const fundingUtxo = outputData.fundingUtxo;
    console.log('💰 Funding UTXO:', fundingUtxo ? `✅ Found (txid: ${fundingUtxo.txid?.substring(0, 8)}..., vout: ${fundingUtxo.vout}, value: ${fundingUtxo.value})` : '❌ Missing');

    if (!spendableOutput) {
      const error = new Error(`Mining UTXO ${outputIndex} not found in turbominingData`);
      console.error('❌ ERROR:', error.message);
      console.log('⏭️  Skipping to next output...\n');
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
      const error = new Error(`Funding UTXO ${outputIndex} not found in mintingProgress`);
      console.error('❌ ERROR:', error.message);
      console.log('🛑 Cannot continue - funding UTXO is required\n');
      failOutput(outputIndex, error);
      if (onComplete) onComplete();
      return;
    }

    try {
      console.log('✅ All validations passed - Starting output processing...');
      startOutput(outputIndex);

      console.log('🔧 Calling OutputProcessor.processOutput...');
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
      
      console.log(`✅ Output #${outputIndex} completed successfully!`);
      console.log('📊 Result:', result);
      completeOutput(outputIndex, result);
      
      const nextIndex = outputIndex + 1;
      
      if (nextIndex < totalOutputs) {
        console.log(`⏭️  Moving to output #${nextIndex} in 1 second...\n`);
        setTimeout(() => processOutput(nextIndex), 1000);
      } else {
        console.log('🎉 All outputs completed!\n');
        if (onComplete) onComplete();
      }

    } catch (error) {
      console.error(`❌ Output #${outputIndex} failed:`, error);
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
      failOutput(outputIndex, error);
      
      const nextIndex = outputIndex + 1;
      
      if (nextIndex < totalOutputs) {
        console.log(`⏭️  Moving to output #${nextIndex} in 2 seconds...\n`);
        setTimeout(() => processOutput(nextIndex), 2000);
      } else {
        console.log('🛑 All outputs processed (with errors)\n');
        if (onComplete) onComplete();
      }
    }
  }, [
    turbominingData,
    walletAddress,
    startOutput,
    completeOutput,
    failOutput,
    updateSubStep,
    updateOutputProgress,
    onComplete
  ]); // Removed outputsProgress - we read from localStorage instead

  return {
    processOutput
  };
}
