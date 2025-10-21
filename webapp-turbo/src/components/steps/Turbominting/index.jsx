import { useState, useEffect } from 'react';
import { useStore } from '../../../store/index.js';
import { useFundingTransaction } from './hooks/useFundingTransaction.js';
import { useFundingAnalysis } from './hooks/useFundingAnalysis.js';
import { useTurbomintingState } from './hooks/useTurbomintingState.js';
import { useMiningBroadcast } from './hooks/useMiningBroadcast.js';
import { MiningTransactionBox } from './components/MiningTransactionBox.jsx';
import { FundingAnalysisBox } from './components/FundingAnalysisBox.jsx';
import { FundingBroadcastBox } from './components/FundingBroadcastBox.jsx';
import { MintingLoopBox } from './components/MintingLoopBox.jsx';
import './styles/index.css';

export function Turbominting() {
  const { wallet } = useStore();
  
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
  } = useTurbomintingState();

  const {
    isBroadcasting,
    broadcastError,
    isMonitoring
  } = useMiningBroadcast(turbominingData, setMiningReady, setConfirmationInfo);

  const fundingAnalysisData = useFundingAnalysis(turbominingData?.numberOfOutputs || 0);
  const funding = useFundingTransaction(turbominingData?.numberOfOutputs || 0);
  
  const [isBroadcastingFunding, setIsBroadcastingFunding] = useState(false);
  const [fundingBroadcastError, setFundingBroadcastError] = useState(null);

  useEffect(() => {
    if (fundingAnalysisData.analysis && fundingAnalysisData.availableUtxos) {
      funding.setAnalysis(fundingAnalysisData.analysis, fundingAnalysisData.availableUtxos, fundingAnalysisData.resultingUtxos);
    }
  }, [fundingAnalysisData.analysis, fundingAnalysisData.availableUtxos, fundingAnalysisData.resultingUtxos]);

  useEffect(() => {
    const needsFunding = fundingAnalysisData.analysis?.strategy !== 'sufficient_utxos';

    if (funding.analysis && needsFunding && !funding.transaction && !funding.isCreating) {
      funding.createFundingTransaction();
    }
  }, [funding.analysis, funding.transaction, funding.isCreating, fundingAnalysisData.analysis]);

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
      />

      <FundingBroadcastBox 
        funding={funding}
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
