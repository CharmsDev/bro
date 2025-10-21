import { useState, useCallback, useEffect } from 'react';
import { FundingTxBuilder } from '../services/funding-tx-builder.js';
import { filterProtectedUtxos } from '../../../../services/utxo/protected-values.js';
import { MINTING_UTXO_VALUE } from '../../../../constants/minting.js';
import { WalletUtxoScanner } from '../../../../services/utxo/WalletUtxoScanner.js';
import TurbomintingService from '../../../../services/turbominting/TurbomintingService.js';

/**
 * useFundingAnalysis - Centralized hook for funding analysis
 * 
 * Scans wallet UTXOs ONE TIME on mount and analyzes funding needs.
 * 
 * @param {number} requiredOutputs - Number of outputs needed for minting
 * @returns {Object} - Funding state with UTXOs, analysis, and derived data
 */
export function useFundingAnalysis(requiredOutputs) {
  const [scannedUtxos, setScannedUtxos] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [state, setState] = useState({
    availableUtxos: [],
    availableSats: 0,
    currentOutputs: 0,
    analysis: null,
    resultingUtxos: [],
    lastDeltaSats: 0,
    error: null
  });
  
  // STEP 1: Check if funding was already broadcasted - if so, hydrate from storage
  useEffect(() => {
    const savedData = TurbomintingService.load();
    
    if (savedData?.fundingBroadcasted === true) {
      const savedAnalysis = TurbomintingService.getFundingAnalysis();
      
      if (savedAnalysis) {
        
        setState({
          availableUtxos: savedAnalysis.availableUtxos || [],
          availableSats: savedAnalysis.availableSats || 0,
          currentOutputs: savedAnalysis.currentOutputs || 0,
          analysis: { strategy: savedAnalysis.strategy },
          resultingUtxos: savedAnalysis.resultingUtxos || [],
          lastDeltaSats: 0,
          error: null
        });
        
        // Skip wallet scan - we already have the data
        return;
      }
    }
    
    let mounted = true;
    
    const scanWallet = async () => {
      setIsScanning(true);
      
      try {
        const scanner = new WalletUtxoScanner();
        const utxoResults = await scanner.scanAllWalletUtxos();
        const availableUtxos = [...utxoResults.recipient, ...utxoResults.change];
        
        // Filter protected UTXOs
        const usableUtxos = filterProtectedUtxos(availableUtxos);
        
        if (mounted) {
          setScannedUtxos(usableUtxos);
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({ ...prev, error: error.message }));
        }
      } finally {
        if (mounted) {
          setIsScanning(false);
        }
      }
    };
    
    scanWallet();
    
    return () => {
      mounted = false;
    };
  }, []); // EMPTY DEPS - RUNS ONCE ON MOUNT
  
  // STEP 2: Analyze funding needs when UTXOs are scanned OR requiredOutputs changes
  useEffect(() => {
    if (!scannedUtxos) return;
    
    const analyze = async () => {
      const availableSats = scannedUtxos.reduce((sum, u) => sum + u.value, 0);
      const currentOutputs = Math.floor(availableSats / MINTING_UTXO_VALUE);
      
      // Analyze funding needs
      const builder = new FundingTxBuilder();
      const analysis = await builder.analyzeFundingNeeds(scannedUtxos, requiredOutputs);
      
      const resultingUtxos = deriveResultingUtxos(analysis, null);
      
      setState({
        availableUtxos: scannedUtxos,
        availableSats,
        currentOutputs,
        analysis,
        resultingUtxos,
        lastDeltaSats: 0,
        error: null
      });
    };
    
    analyze();
  }, [scannedUtxos, requiredOutputs]); // Re-analyze when requiredOutputs changes
  
  return {
    ...state,
    isScanning,
    analyzeFunding: () => {} // Dummy function
  };
}

/**
 * Derive resulting UTXOs from analysis
 * 
 * Priority:
 * 1. If funding transaction exists, use its outputs
 * 2. If utxosToUse exists (sufficient or partial without TX), use them
 * 3. If partial 2B (needs TX but not created), derive theoretical outputs
 * 4. If split/combine, derive from details
 * 
 * @param {Object} analysis - Funding analysis result
 * @param {Object} fundingTransaction - Funding transaction (if exists)
 * @returns {Array} - Array of resulting UTXO objects
 */
function deriveResultingUtxos(analysis, fundingTransaction) {
  // Case 1: Funding transaction exists
  if (fundingTransaction?.outputs) {
    return fundingTransaction.outputs.map((output, vout) => ({
      ...output,
      vout,
      source: 'funding_tx'
    }));
  }
  
  // Case 2: UTXOs to use (sufficient or partial without TX)
  if (analysis.utxosToUse?.length > 0) {
    return analysis.utxosToUse;
  }
  
  // Case 3: Partial 2B - derive new outputs from analysis
  if (analysis.isPartial && analysis.outputCount) {
    const newOutputs = [];
    
    // Minting outputs
    for (let i = 0; i < analysis.outputCount; i++) {
      newOutputs.push({
        value: analysis.outputValue || MINTING_UTXO_VALUE,
        type: 'minting',
        vout: i,
        source: 'new'
      });
    }
    
    // Change output - merge with last minting output if too small
    if (analysis.mathematics?.totalChange > 0) {
      const changeValue = analysis.mathematics.totalChange;
      
      // If change is less than MINTING_UTXO_VALUE, merge with last minting output
      if (changeValue < MINTING_UTXO_VALUE && newOutputs.length > 0) {
        const lastOutput = newOutputs[newOutputs.length - 1];
        lastOutput.value += changeValue;
        lastOutput.type = 'minting'; // Keep as minting (now has extra sats)
      } else {
        // Change is large enough, keep separate
        newOutputs.push({
          value: changeValue,
          type: 'change',
          vout: analysis.outputCount,
          source: 'new'
        });
      }
    }
    
    return newOutputs;
  }
  
  // Case 4: Split/Combine - derive from details
  if (analysis.splitDetails || analysis.combineDetails) {
    const newOutputs = [];
    const details = analysis.splitDetails || analysis.combineDetails;
    const outputCount = details.willCreate || details.willCreateOutputs || 0;
    
    // Minting outputs
    for (let i = 0; i < outputCount; i++) {
      newOutputs.push({
        value: MINTING_UTXO_VALUE,
        type: 'minting',
        vout: i,
        source: 'new'
      });
    }
    
    // Change output - merge with last minting output if too small
    if (analysis.mathematics?.totalChange > 0) {
      const changeValue = analysis.mathematics.totalChange;
      
      // If change is less than MINTING_UTXO_VALUE, merge with last minting output
      if (changeValue < MINTING_UTXO_VALUE && newOutputs.length > 0) {
        const lastOutput = newOutputs[newOutputs.length - 1];
        lastOutput.value += changeValue;
        lastOutput.type = 'minting'; // Keep as minting (now has extra sats)
      } else {
        // Change is large enough, keep separate
        newOutputs.push({
          value: changeValue,
          type: 'change',
          vout: outputCount,
          source: 'new'
        });
      }
    }
    
    return newOutputs;
  }
  
  return [];
}
