import { useState, useCallback, useEffect } from 'react';
import { FundingTxBuilder } from '../services/funding-tx-builder.js';
import { filterProtectedUtxos } from '../../../../services/utxo/protected-values.js';
import { MINTING_UTXO_VALUE } from '../../../../constants/minting.js';
import { WalletUtxoScanner } from '../../../../services/utxo/WalletUtxoScanner.js';
import TurbomintingService from '../../../../services/turbominting/TurbomintingService.js';

// Centralized hook for funding analysis - scans wallet UTXOs once on mount
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
  
  // Check if funding was already broadcasted
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
  }, []);
  
  // Analyze funding needs when UTXOs are scanned
  useEffect(() => {
    if (!scannedUtxos) return;
    
    const analyze = async () => {
      const availableSats = scannedUtxos.reduce((sum, u) => sum + u.value, 0);
      const currentOutputs = Math.floor(availableSats / MINTING_UTXO_VALUE);
      
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
  }, [scannedUtxos, requiredOutputs]);
  
  return {
    ...state,
    isScanning
  };
}

// Derive resulting UTXOs from analysis
function deriveResultingUtxos(analysis, fundingTransaction) {
  // Case 1: Funding transaction exists
  if (fundingTransaction?.outputs) {
    return fundingTransaction.outputs.map((output, vout) => ({
      ...output,
      txid: fundingTransaction.txid,
      vout,
      source: 'funding_tx'
    }));
  }
  
  // Case 2: Use existing UTXOs
  if (analysis.utxosToUse?.length > 0) {
    return analysis.utxosToUse.map(utxo => ({
      ...utxo,
      source: utxo.source || 'existing'
    }));
  }
  
  // Case 3: Needs splitting
  if (analysis.needsSplitting && analysis.outputCount) {
    const theoreticalOutputs = [];
    
    for (let i = 0; i < analysis.outputCount; i++) {
      theoreticalOutputs.push({
        value: analysis.outputValue || MINTING_UTXO_VALUE,
        type: 'minting',
        vout: i,
        source: 'theoretical'
      });
    }
    
    if (analysis.mathematics?.totalChange > 0) {
      const changeValue = analysis.mathematics.totalChange;
      
      if (changeValue >= MINTING_UTXO_VALUE) {
        theoreticalOutputs.push({
          value: changeValue,
          type: 'change',
          vout: analysis.outputCount,
          source: 'theoretical'
        });
      } else if (theoreticalOutputs.length > 0) {
        theoreticalOutputs[theoreticalOutputs.length - 1].value += changeValue;
      }
    }
    
    return theoreticalOutputs;
  }
  
  return [];
}
