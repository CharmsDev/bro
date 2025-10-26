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
  
  // [RJJ-DEBUG] TEMPORARY DEBUG FLAG - Set to true to force re-scan on every refresh
  const FORCE_RESCAN_FOR_TESTING = true;
  
  // Check if funding was already broadcasted
  useEffect(() => {
    const savedData = TurbomintingService.load();
    
    if (!FORCE_RESCAN_FOR_TESTING && savedData?.fundingBroadcasted === true) {
      const savedAnalysis = TurbomintingService.getFundingAnalysis();
      
      if (savedAnalysis) {
        console.log('[RJJ-DEBUG] 📦 Using saved analysis:', savedAnalysis);
        
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
    
    if (FORCE_RESCAN_FOR_TESTING) {
      console.log('[RJJ-DEBUG] 🔧 Force re-scan enabled - ignoring saved data');
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
      // Include mining TX change as theoretical UTXO if available
      const miningChangeUtxo = turbominingData?.miningTxid && turbominingData?.changeAmount > 0 ? {
        txid: turbominingData.miningTxid,
        // Change is after OP_RETURN (vout 0) + spendable outputs (vout 1..N)
        vout: (turbominingData.spendableOutputs?.length || turbominingData.numberOfOutputs || 0) + 1,
        value: turbominingData.changeAmount,
        source: 'mining_tx_pending'
      } : null;
      
      // Combine scanned UTXOs with mining change, removing duplicates
      let allUtxos = [...scannedUtxos];
      if (miningChangeUtxo) {
        // Check if mining change already exists in scanned UTXOs
        const isDuplicate = scannedUtxos.some(u => 
          u.txid === miningChangeUtxo.txid && u.vout === miningChangeUtxo.vout
        );
        
        if (isDuplicate) {
          console.log('[RJJ-DEBUG] ⚠️ Mining TX change already in wallet - skipping duplicate');
        } else {
          allUtxos.push(miningChangeUtxo);
          console.log('[RJJ-DEBUG] ✅ Added mining TX change as theoretical UTXO');
        }
      }
      
      const availableSats = allUtxos.reduce((sum, u) => sum + u.value, 0);
      const currentOutputs = Math.floor(availableSats / MINTING_UTXO_VALUE);
      
      console.log('[RJJ-DEBUG] 🔍 Starting analysis:', {
        scannedUtxos: scannedUtxos.length,
        miningChangeUtxo,
        allUtxos: allUtxos.length,
        requiredOutputs,
        excludeUtxo
      });
      
      console.log('[RJJ-DEBUG] 🔍 All available UTXOs:');
      allUtxos.forEach((utxo, idx) => {
        console.log(`[RJJ-DEBUG]   allUtxos[${idx}]:`, {
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value,
          source: utxo.source
        });
      });
      
      const builder = new FundingTxBuilder();
      const analysis = await builder.analyzeFundingNeeds(allUtxos, requiredOutputs, excludeUtxo);
      
      console.log('[RJJ-DEBUG] 📊 Analysis result:', analysis);
      if (analysis.utxosToUse) {
        console.log('[RJJ-DEBUG] 📊 Analysis.utxosToUse:');
        analysis.utxosToUse.forEach((utxo, idx) => {
          console.log(`[RJJ-DEBUG]   utxosToUse[${idx}]:`, {
            txid: utxo.txid,
            vout: utxo.vout,
            value: utxo.value
          });
        });
      }
      
      const resultingUtxos = deriveResultingUtxos(analysis, null);
      
      console.log('[RJJ-DEBUG] ✅ Resulting UTXOs:', resultingUtxos);
      resultingUtxos.forEach((utxo, idx) => {
        console.log(`[RJJ-DEBUG]   UTXO ${idx}:`, {
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value,
          source: utxo.source
        });
      });
      
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
  }, [scannedUtxos, requiredOutputs, excludeUtxo, turbominingData]);
  
  // Expose function to force re-scan (for when new funds are detected)
  const forceRescan = async () => {
    console.log('[RJJ-DEBUG] 🔄 Force re-scan triggered by new funds detection');
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
