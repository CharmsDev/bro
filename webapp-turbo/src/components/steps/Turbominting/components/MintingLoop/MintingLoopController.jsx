// Minting Loop Controller - Main orchestrator
import { useState, useCallback } from 'react';
import { useMintingLoop } from './useMintingLoop.js';
import { useOutputProcessor } from './hooks/useOutputProcessor.js';
import { ProgressGrid } from './ProgressGrid.jsx';
import { TransactionHistory } from './TransactionHistory.jsx';
import { PayloadService } from './services/PayloadService.js';

export function MintingLoopController({ 
  turbominingData, 
  fundingAnalysis,
  walletAddress,
  miningReady,
  fundingReady,
  onComplete 
}) {
  const mintingAllowed = miningReady && fundingReady;
  
  // Calcular cuántos outputs podemos realmente mintear según fondos disponibles
  // Si no hay análisis completo, affordableOutputs = undefined (gris por defecto)
  const affordableOutputs = fundingAnalysis?.currentOutputs || fundingAnalysis?.resultingUtxos?.length || undefined;
  const totalOutputs = turbominingData?.numberOfOutputs || 0;
  
  const {
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
  } = useMintingLoop(turbominingData.numberOfOutputs);

  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('progress'); // 'progress' | 'history'

  // Use output processor hook
  const { processOutput } = useOutputProcessor({
    turbominingData,
    fundingAnalysis,
    walletAddress,
    startOutput,
    completeOutput,
    failOutput,
    updateSubStep,
    updateOutputProgress,
    onComplete
  });

  // Start the minting loop
  const startMinting = useCallback(() => {
    if (!mintingAllowed) {
      if (!miningReady) {
        setError('Mining not ready - waiting for transaction confirmation');
      } else if (!fundingReady) {
        setError('Funding not ready - waiting for transaction broadcast');
      }
      return;
    }

    
    setError(null);
    processOutput(0);
  }, [mintingAllowed, miningReady, fundingReady, processOutput, turbominingData]);

  // Retry failed output
  const retryOutput = useCallback((index) => {
    setError(null);
    processOutput(index);
  }, [processOutput]);

  // Download payload for debugging
  const downloadPayload = useCallback((index) => {
    const output = outputsProgress[index];
    if (output?.payload) {
      PayloadService.createDownloadablePayload(output.payload, index);
    }
  }, [outputsProgress]);

  if (!turbominingData || !turbominingData.spendableOutputs) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-6 text-center">
        <p className="text-slate-500">No turbomining data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-600">
        <button
          onClick={() => setActiveTab('progress')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'progress'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          📊 Progress Grid
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'history'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          📜 Transaction History {completedCount > 0 && `(${completedCount})`}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'progress' ? (
        <ProgressGrid 
          outputsProgress={outputsProgress}
          currentOutputIndex={currentOutputIndex}
          lastProcessedIndex={lastProcessedIndex}
          affordableOutputs={affordableOutputs}
        />
      ) : (
        <TransactionHistory 
          outputsProgress={outputsProgress}
        />
      )}

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3">
        {!isProcessing && completedCount === 0 && (
          <button
            onClick={startMinting}
            disabled={!mintingAllowed}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              mintingAllowed
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }`}
          >
            🚀 Start Minting Loop
          </button>
        )}

        {completedCount > 0 && completedCount < affordableOutputs && !isProcessing && (
          <button
            onClick={() => processOutput(completedCount)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            ▶️ Continue Minting
          </button>
        )}

        {completedCount === affordableOutputs && (
          <div className="flex-1 bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-4">
            <p className="text-emerald-400 font-semibold text-center">
              {affordableOutputs === totalOutputs 
                ? `✅ All ${totalOutputs} outputs minted successfully!`
                : `✅ Minted ${affordableOutputs} of ${totalOutputs} outputs (limited by available funds)`
              }
            </p>
          </div>
        )}

        {/* RJJ TODO: ELIMINAR TODA LA FUNCIONALIDAD DEL RESET ALL
            Este botón está oculto temporalmente. 
            En el futuro, eliminar completamente:
            - Este botón y su handler
            - La función resetProgress() en useMintingLoop.js
            - Cualquier referencia a reset en el minting loop
            El usuario debe usar "Mint More" en el footer para empezar un nuevo ciclo.
        */}
        {false && (completedCount > 0 || failedCount > 0) && (
          <button
            onClick={resetProgress}
            className="px-4 py-2 border border-slate-500 hover:border-slate-400 text-slate-300 rounded-lg text-sm transition-colors"
          >
            🔄 Reset All
          </button>
        )}
      </div>

      {/* Status Message - Only show mining confirmation wait */}
      {!mintingAllowed && !miningReady && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            ⏳ Waiting for mining transaction confirmation...
          </p>
        </div>
      )}
    </div>
  );
}
