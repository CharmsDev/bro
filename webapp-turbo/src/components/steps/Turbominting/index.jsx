import { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../../../store/index.js';
import { useFundingTransaction } from './hooks/useFundingTransaction.js';
import { useFundingAnalysis } from './hooks/useFundingAnalysis.js';
import { useTurbomintingState } from './hooks/useTurbomintingState.js';
import { useTurbomintingFlowV2 } from './hooks/useTurbomintingFlowV2.js';
import { useMiningBroadcast } from './hooks/useMiningBroadcast.js';
import { MiningTransactionBox } from './components/MiningTransactionBox.jsx';
import { FundingAnalysisBox } from './components/FundingAnalysisBox.jsx';
import { FundingBroadcastBox } from './components/FundingBroadcastBox.jsx';
import { MintingLoopBox } from './components/MintingLoopBox.jsx';
import TurbomintingService from '../../../services/turbominting/TurbomintingService.js';
import { getSoundEffects } from './utils/soundEffects.js';
import CentralStorage from '../../../storage/CentralStorage.js';
import './styles/index.css';

export function Turbominting() {
  const { wallet } = useStore();
  const [shouldPlaySoundOnInteraction, setShouldPlaySoundOnInteraction] = useState(false);
  
  // ═══════════════════════════════════════════════════════════════
  // FEATURE FLAG - V2 Flow (can be toggled via localStorage)
  // ═══════════════════════════════════════════════════════════════
  const useV2Flow = localStorage.getItem('TURBOMINTING_V2_ENABLED') === 'true';
  
  // Log complete localStorage state on mount
  useEffect(() => {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  🚀 TURBOMINTING - INITIALIZATION                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    console.log('📦 READING LOCALSTORAGE DATA...\n');
    
    // Get all turbominting-related data
    const turbomining = CentralStorage.getTurbomining();
    const turbominting = CentralStorage.getTurbominting();
    const mintingProgress = turbominting?.mintingProgress || null;
    const state = CentralStorage.getAll();
    const batch = state.batch || null;
    const wallet = CentralStorage.getWallet();
    const isRecoveryMode = CentralStorage.isMiningRecoveryMode();
    
    console.log('1️⃣  TURBOMINING DATA:');
    console.log('═══════════════════════════════════════════════════════════════');
    if (turbomining) {
      console.log(JSON.stringify(turbomining, null, 2));
      console.log('\n📊 TURBOMINING VALIDATION:');
      console.log('  ✓ signedTxHex:', turbomining.signedTxHex ? `${turbomining.signedTxHex.length} chars` : '❌ MISSING');
      console.log('  ✓ miningTxid:', turbomining.miningTxid || '❌ MISSING');
      console.log('  ✓ spendableOutputs:', turbomining.spendableOutputs?.length || '❌ MISSING');
      console.log('  ✓ numberOfOutputs:', turbomining.numberOfOutputs || '❌ MISSING');
      console.log('  ✓ miningData.reward:', turbomining.miningData?.reward || '❌ MISSING');
      console.log('  ✓ miningData.nonce:', turbomining.miningData?.nonce || '❌ MISSING');
      console.log('  ✓ miningData.hash:', turbomining.miningData?.hash || '❌ MISSING');
      console.log('  ✓ challengeTxid:', turbomining.challengeTxid || '(empty - OK for recovery)');
      console.log('  ✓ challengeVout:', turbomining.challengeVout ?? '❌ MISSING');
      console.log('  ✓ changeAmount:', turbomining.changeAmount ?? '❌ MISSING');
    } else {
      console.log('❌ NO TURBOMINING DATA FOUND');
    }
    
    console.log('\n2️⃣  TURBOMINTING DATA:');
    console.log('═══════════════════════════════════════════════════════════════');
    if (turbominting) {
      console.log(JSON.stringify(turbominting, null, 2));
      console.log('\n📊 TURBOMINTING VALIDATION:');
      console.log('  ✓ miningTxid:', turbominting.miningTxid || '❌ MISSING');
      console.log('  ✓ miningTxConfirmed:', turbominting.miningTxConfirmed ?? '❌ MISSING');
      console.log('  ✓ miningReady:', turbominting.miningReady ?? '❌ MISSING');
      console.log('  ✓ confirmationInfo.blockHeight:', turbominting.confirmationInfo?.blockHeight ?? '❌ MISSING');
      console.log('  ✓ confirmationInfo.confirmations:', turbominting.confirmationInfo?.confirmations ?? '❌ MISSING');
      console.log('  ✓ confirmationInfo.timestamp:', turbominting.confirmationInfo?.timestamp ?? '❌ MISSING');
    } else {
      console.log('❌ NO TURBOMINTING DATA FOUND');
    }
    
    console.log('\n3️⃣  MINTING PROGRESS:');
    console.log('═══════════════════════════════════════════════════════════════');
    if (mintingProgress) {
      console.log(JSON.stringify(mintingProgress, null, 2));
      console.log('\n📊 MINTING PROGRESS VALIDATION:');
      console.log('  ✓ completed:', mintingProgress.completed ?? '❌ MISSING');
      console.log('  ✓ total:', mintingProgress.total ?? '❌ MISSING');
      console.log('  ✓ outputs:', mintingProgress.outputs?.length || '❌ MISSING');
      if (mintingProgress.outputs) {
        mintingProgress.outputs.forEach((output, i) => {
          console.log(`\n  Output ${i}:`);
          console.log(`    - status: ${output.status || '❌ MISSING'}`);
          console.log(`    - fundingUtxo: ${output.fundingUtxo ? '✓ Present' : '❌ MISSING'}`);
          if (output.fundingUtxo) {
            console.log(`      • txid: ${output.fundingUtxo.txid}`);
            console.log(`      • vout: ${output.fundingUtxo.vout}`);
            console.log(`      • value: ${output.fundingUtxo.value}`);
          }
        });
      }
    } else {
      console.log('❌ NO MINTING PROGRESS FOUND');
    }
    
    console.log('\n4️⃣  BATCH DATA:');
    console.log('═══════════════════════════════════════════════════════════════');
    if (batch) {
      console.log('  ✓ utxos:', batch.utxos?.length || 0);
      console.log('  ✓ selectedUtxos:', batch.selectedUtxos?.length || 0);
    } else {
      console.log('❌ NO BATCH DATA FOUND');
    }
    
    console.log('\n5️⃣  WALLET DATA:');
    console.log('═══════════════════════════════════════════════════════════════');
    if (wallet) {
      console.log('  ✓ address:', wallet.address || '❌ MISSING');
      console.log('  ✓ seedPhrase:', wallet.seedPhrase ? 'Present' : '❌ MISSING');
    } else {
      console.log('❌ NO WALLET DATA FOUND');
    }
    
    console.log('\n6️⃣  RECOVERY MODE:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ✓ isRecoveryMode:', isRecoveryMode ? '✅ YES' : '❌ NO');
    
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ LOCALSTORAGE INSPECTION COMPLETE                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  }, []);
  
  // Initialize audio context on first user interaction and play sound if needed
  useEffect(() => {
    const initAudioAndPlay = () => {
      try {
        const soundEffects = getSoundEffects();
        soundEffects.initAudioContext();
        
        // If transaction was already confirmed on load, play sound now
        if (shouldPlaySoundOnInteraction) {
          soundEffects.playConfirmationSound();
          setShouldPlaySoundOnInteraction(false);
        }
      } catch (error) {
        // Ignore errors
      }
    };
    
    document.addEventListener('click', initAudioAndPlay, { once: true });
    document.addEventListener('keydown', initAudioAndPlay, { once: true });
    
    return () => {
      document.removeEventListener('click', initAudioAndPlay);
      document.removeEventListener('keydown', initAudioAndPlay);
    };
  }, [shouldPlaySoundOnInteraction]);
  
  // ═══════════════════════════════════════════════════════════════
  // V1 or V2 State Management
  // ═══════════════════════════════════════════════════════════════
  const stateV1 = useTurbomintingState(setShouldPlaySoundOnInteraction);
  const stateV2 = useTurbomintingFlowV2();
  
  // Use V1 or V2 based on feature flag
  const {
    turbominingData,
    setTurbominingData,
    miningReady,
    setMiningReady,
    fundingReady,
    setFundingReady,
    error,
    confirmationInfo,
    setConfirmationInfo
  } = useV2Flow ? {
    // V2: Derive from V2 state
    turbominingData: stateV2.currentData,
    setTurbominingData: () => {}, // Not used in V2
    miningReady: stateV2.step1Complete,
    setMiningReady: () => {},
    fundingReady: stateV2.step3Complete,
    setFundingReady: () => {},
    error: stateV2.error,
    confirmationInfo: stateV2.currentData?.confirmationInfo,
    setConfirmationInfo: () => {}
  } : stateV1;

  const {
    isBroadcasting,
    broadcastError,
    isMonitoring
  } = useMiningBroadcast(turbominingData, setMiningReady, setConfirmationInfo, setTurbominingData);

  // Exclude challenge UTXO from funding analysis to prevent double-spend with mining TX
  // Safe to always exclude: if TX is confirmed, API won't return it anyway (no-op)
  // Use useMemo to prevent recreating this object on every render (causes infinite loop)
  const challengeUtxo = useMemo(() => {
    return turbominingData?.challengeTxid ? {
      txid: turbominingData.challengeTxid,
      vout: turbominingData.challengeVout
    } : null;
  }, [turbominingData?.challengeTxid, turbominingData?.challengeVout]);
  
  const fundingAnalysisData = useFundingAnalysis(
    turbominingData?.numberOfOutputs || 0,
    challengeUtxo,
    turbominingData
  );
  const funding = useFundingTransaction(turbominingData?.numberOfOutputs || 0);
  
  const [isBroadcastingFunding, setIsBroadcastingFunding] = useState(false);
  const [fundingBroadcastError, setFundingBroadcastError] = useState(null);

  // Use ref to track if we've already initialized
  const hasInitialized = useRef(false);
  
  // Extract stable values to avoid infinite loop
  const numberOfOutputsForInit = turbominingData?.numberOfOutputs;
  const setAnalysis = funding.setAnalysis; // This is stable (useCallback)
  
  // Stabilize objects using JSON comparison
  const analysisHash = useMemo(() => 
    JSON.stringify(fundingAnalysisData.analysis), 
    [fundingAnalysisData.analysis]
  );
  const availableUtxosHash = useMemo(() => 
    JSON.stringify(fundingAnalysisData.availableUtxos), 
    [fundingAnalysisData.availableUtxos]
  );
  const resultingUtxosHash = useMemo(() => 
    JSON.stringify(fundingAnalysisData.resultingUtxos), 
    [fundingAnalysisData.resultingUtxos]
  );
  
  useEffect(() => {
    console.log('🔍 [INIT CHECK] Funding analysis data changed');
    console.log('  • analysis:', fundingAnalysisData.analysis ? '✅' : '❌');
    console.log('  • availableUtxos:', fundingAnalysisData.availableUtxos?.length || 0);
    console.log('  • resultingUtxos:', fundingAnalysisData.resultingUtxos?.length || 0);
    console.log('  • numberOfOutputsForInit:', numberOfOutputsForInit);
    console.log('  • hasInitialized.current:', hasInitialized.current);
    
    if (fundingAnalysisData.analysis && fundingAnalysisData.availableUtxos) {
      setAnalysis(fundingAnalysisData.analysis, fundingAnalysisData.availableUtxos, fundingAnalysisData.resultingUtxos);
      
      // POINT 1: Initialize minting progress with funding analysis results (only once)
      if (!hasInitialized.current && fundingAnalysisData.resultingUtxos?.length > 0 && numberOfOutputsForInit) {
        console.log('✅ [INIT] Initializing minting progress...');
        console.log('  • Total outputs:', numberOfOutputsForInit);
        console.log('  • Resulting UTXOs:', fundingAnalysisData.resultingUtxos);
        
        // Check if we need to force re-initialization (repair missing fundingUtxos)
        const current = TurbomintingService.load();
        const needsRepair = current?.mintingProgress?.outputs?.some(o => !o.fundingUtxo || !o.fundingUtxo.txid);
        
        console.log('  • Needs repair:', needsRepair ? '✅ YES (missing fundingUtxos)' : '❌ NO');
        
        const success = TurbomintingService.initializeMintingProgress(
          numberOfOutputsForInit,
          fundingAnalysisData.resultingUtxos,
          needsRepair // Force if needs repair
        );
        
        console.log('  • Initialization result:', success ? '✅ Success' : '❌ Failed');
        
        // Verify what was saved
        const saved = TurbomintingService.load();
        console.log('  • Saved mintingProgress:', saved?.mintingProgress);
        
        hasInitialized.current = true;
      } else {
        console.log('⏭️  [INIT] Skipping initialization:');
        console.log('  • Already initialized:', hasInitialized.current);
        console.log('  • Has resulting UTXOs:', fundingAnalysisData.resultingUtxos?.length > 0);
        console.log('  • Has numberOfOutputs:', !!numberOfOutputsForInit);
      }
    }
  }, [analysisHash, availableUtxosHash, resultingUtxosHash, numberOfOutputsForInit, setAnalysis, fundingAnalysisData.analysis, fundingAnalysisData.availableUtxos, fundingAnalysisData.resultingUtxos]);

  // Extract stable values from funding to avoid infinite loop
  const fundingAnalysis = funding.analysis;
  const fundingTransaction = funding.transaction;
  const fundingIsCreating = funding.isCreating;
  const createFundingTransaction = funding.createFundingTransaction;
  const analysisStrategy = fundingAnalysisData.analysis?.strategy;
  
  useEffect(() => {
    const needsFunding = analysisStrategy !== 'sufficient_utxos';

    if (fundingAnalysis && needsFunding && !fundingTransaction && !fundingIsCreating) {
      createFundingTransaction();
    }
  }, [fundingAnalysis, fundingTransaction, fundingIsCreating, analysisStrategy, createFundingTransaction]);

  // Auto-activate fundingReady when funds are sufficient (no funding TX needed)
  useEffect(() => {
    if (analysisStrategy === 'sufficient_utxos' && !fundingReady) {
      setFundingReady(true);
      TurbomintingService.setFundingReady(true);
    }
  }, [analysisStrategy, fundingReady, setFundingReady]);

  // Log testmempoolaccept command when funding transaction is created
  // testmempoolaccept command available in funding.transaction.signedHex

  // Handle funding transaction broadcast
  const handleBroadcastFundingTx = async () => {
    if (!funding.transaction?.signedHex) {
      setFundingBroadcastError('No signed transaction available');
      return;
    }

    setIsBroadcastingFunding(true);
    setFundingBroadcastError(null);

    try {
      // Prepare full funding transaction data for persistence
      const fundingTransactionData = {
        txid: '', // Will be set by service
        signedHex: funding.transaction.signedHex,
        outputs: funding.transaction.outputs,
        decoded: funding.transaction.decoded,
        inputUtxos: funding.transaction.inputUtxos
      };

      // Prepare funding analysis data for persistence
      const fundingAnalysisToPersist = {
        strategy: fundingAnalysisData.analysis?.strategy,
        availableUtxos: fundingAnalysisData.availableUtxos,
        resultingUtxos: fundingAnalysisData.resultingUtxos,
        currentOutputs: fundingAnalysisData.currentOutputs,
        availableSats: fundingAnalysisData.availableSats
      };
      
      
      // Broadcast and save to storage via service
      const result = await TurbomintingService.broadcastFundingTransaction(
        funding.transaction.signedHex,
        fundingTransactionData,
        fundingAnalysisToPersist
      );
      
      
      if (result.success) {
        
        setTurbominingData(prev => ({
          ...prev,
          fundingTxid: result.txid,
          fundingExplorerUrl: result.explorerUrl,
          fundingTxConfirmed: false,
          fundingReady: true,
          fundingBroadcasted: true
        }));

        // Enable funding ready flag immediately (no need to wait for confirmation)
        setFundingReady(true);
        
        // POINT 2: Update minting progress with real funding TX outputs
        const savedData = TurbomintingService.load();
        if (savedData?.fundingAnalysis?.resultingUtxos) {
          const updatedResultingUtxos = savedData.fundingAnalysis.resultingUtxos.map(utxo => ({
            ...utxo,
            txid: result.txid,
            source: 'funding_tx'
          }));
          
          TurbomintingService.initializeMintingProgress(
            turbominingData.numberOfOutputs,
            updatedResultingUtxos
          );
        }

        // Start monitoring for confirmation (for UI status only)
        monitorFundingConfirmation(result.txid);
        
      } else {
        setFundingBroadcastError(result.error || 'Broadcast failed');
        // Do NOT advance - keep UI in editable state
      }
      
    } catch (error) {
      // On error, do NOT set fundingBroadcasted - keep UI editable
      setFundingBroadcastError(error.message);
    } finally {
      setIsBroadcastingFunding(false);
    }
  };

  // Monitor funding transaction confirmation
  const monitorFundingConfirmation = async (txid) => {
    try {
      await TurbomintingService.monitorFundingConfirmation(
        txid,
        (result) => {
          // Update local state
          setTurbominingData(prev => ({
            ...prev,
            fundingTxConfirmed: true,
            fundingConfirmationInfo: result
          }));
        },
        (error) => {
        }
      );
    } catch (error) {
    }
  };

  // Error state
  if (error) {
    return (
      <div className="turbominting-container">
        <div className="text-center py-16">
          <h2 className="text-4xl font-bold text-purple-400 mb-6">⚡ Turbominting</h2>
          <div className="bg-red-900/20 border border-red-600 rounded-2xl p-8 max-w-2xl mx-auto">
            <p className="text-red-400 text-lg mb-4">❌ {error}</p>
            <button
              onClick={() => window.location.href = '/turbomining'}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              ← Back to Turbomining
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!turbominingData) {
    return (
      <div className="turbominting-container">
        <div className="text-center py-16">
          <h2 className="text-4xl font-bold text-purple-400 mb-6">⚡ Turbominting</h2>
          <div className="bg-slate-900/60 border border-slate-600 rounded-2xl p-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              <p className="text-slate-300 text-lg">Loading turbomining data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="turbominting-container">
      {/* Header */}
      <div className="turbominting-header mb-8">
        <h2 className="text-4xl font-bold text-center mb-4 text-purple-400">
          ⚡ Turbominting Process
        </h2>
        <p className="text-slate-300 text-center text-lg">
          Automated multi-output BRO token minting with {turbominingData.numberOfOutputs} outputs
        </p>
      </div>

      <MiningTransactionBox 
        turbominingData={turbominingData}
        isBroadcasting={isBroadcasting}
        broadcastError={broadcastError}
        isMonitoring={isMonitoring}
        confirmationInfo={confirmationInfo}
      />

      <FundingAnalysisBox 
        turbominingData={turbominingData}
        walletAddress={wallet?.address}
        fundingAnalysisData={fundingAnalysisData}
        onForceRescan={fundingAnalysisData.forceRescan}
      />

      <FundingBroadcastBox 
        funding={funding}
        fundingAnalysisData={fundingAnalysisData}
        fundingTxid={turbominingData?.fundingTxid}
        fundingExplorerUrl={turbominingData?.fundingExplorerUrl}
        fundingTxConfirmed={turbominingData?.fundingTxConfirmed}
        onBroadcast={handleBroadcastFundingTx}
        isBroadcasting={isBroadcastingFunding}
        broadcastError={fundingBroadcastError}
      />

      <MintingLoopBox 
        turbominingData={turbominingData}
        fundingAnalysis={fundingAnalysisData}
        walletAddress={wallet?.address}
        miningReady={miningReady}
        fundingReady={fundingReady}
        onComplete={() => {
          // Minting loop completed
        }}
      />
    </div>
  );
}
