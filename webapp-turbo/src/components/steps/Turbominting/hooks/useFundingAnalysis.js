import { useState, useCallback, useEffect } from 'react';
import { FundingTxBuilder } from '../services/funding-tx-builder.js';
import { filterProtectedUtxos } from '../../../../services/utxo/protected-values.js';
import { MINTING_UTXO_VALUE } from '../../../../constants/minting.js';
import { WalletUtxoScanner } from '../../../../services/utxo/WalletUtxoScanner.js';
import TurbomintingService from '../../../../services/turbominting/TurbomintingService.js';

// Centralized hook for funding analysis - scans wallet UTXOs once on mount
export function useFundingAnalysis(requiredOutputs, excludeUtxo = null, turbominingData = null) {
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
          analysis: savedAnalysis.analysis || null,
          resultingUtxos: savedAnalysis.resultingUtxos || [],
          lastDeltaSats: 0,
          error: null
        });
        setIsScanning(false);
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
  // Extract stable values from turbominingData to avoid infinite loops
  const miningTxid = turbominingData?.miningTxid;
  const changeAmount = turbominingData?.changeAmount;
  const spendableOutputsLength = turbominingData?.spendableOutputs?.length;
  const numberOfOutputs = turbominingData?.numberOfOutputs;
  
  useEffect(() => {
    if (!scannedUtxos) return;
    
    const analyze = async () => {
      // Include mining TX change as theoretical UTXO if available
      const miningChangeUtxo = miningTxid && changeAmount > 0 ? {
        txid: miningTxid,
        // Change is after OP_RETURN (vout 0) + spendable outputs (vout 1..N)
        vout: (spendableOutputsLength || numberOfOutputs || 0) + 1,
        value: changeAmount,
        source: 'mining_tx_pending'
      } : null;
      
      // Combine scanned UTXOs with mining change, removing duplicates
      let allUtxos = [...scannedUtxos];
      if (miningChangeUtxo) {
        // Check if mining change already exists in scanned UTXOs
        const isDuplicate = scannedUtxos.some(u => 
          u.txid === miningChangeUtxo.txid && u.vout === miningChangeUtxo.vout
        );
        
        if (!isDuplicate) {
          allUtxos.push(miningChangeUtxo);
        }
      }
      
      const availableSats = allUtxos.reduce((sum, u) => sum + u.value, 0);
      const currentOutputs = Math.floor(availableSats / MINTING_UTXO_VALUE);
      
      const builder = new FundingTxBuilder();
      const analysis = await builder.analyzeFundingNeeds(allUtxos, requiredOutputs, excludeUtxo);
      const resultingUtxos = deriveResultingUtxos(analysis, null);
      
      setState({
        availableUtxos: allUtxos,
        availableSats,
        currentOutputs,
        analysis,
        resultingUtxos,
        lastDeltaSats: 0,
        error: null
      });
    };
    
    analyze();
  }, [scannedUtxos, requiredOutputs, excludeUtxo, miningTxid, changeAmount, spendableOutputsLength, numberOfOutputs]);
  
  // Expose function to force re-scan (for when new funds are detected)
  const forceRescan = async () => {
    setIsScanning(true);
    try {
      const wallet = await getWallet();
      if (!wallet?.address) {
        throw new Error('No wallet available');
      }
      
      const utxos = await scanWalletUtxos(wallet.address);
      setScannedUtxos(utxos);
    } catch (error) {
      console.error('Force re-scan failed:', error);
      setState(prev => ({ ...prev, error: error.message }));
    } finally {
      setIsScanning(false);
    }
  };
  
  return {
    ...state,
    isScanning,
    forceRescan
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
