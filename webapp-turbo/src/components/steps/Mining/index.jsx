import React, { useEffect, useState } from 'react';
import { useStore } from '../../../store/index.js';
import { useMining } from '../../../hooks/useMining.js';
import { TokenRewardDisplay } from './components/TokenRewardDisplay.jsx';
import MiningModule from '../../../modules/mining/MiningModule.js';
import './Mining.css';

export function Mining() {
  const { mining, batch, isProcessing } = useStore();
  const {
    startMining,
    stopMining,
    changeMiningMode,
    formatHashRate
  } = useMining();

  // Sync local state with store (which loads from orchestrator/localStorage)
  const [selectedMode, setSelectedMode] = useState(mining.mode || 'cpu');
  const [lockStatus, setLockStatus] = useState({ isLocked: false, reason: null });

  useEffect(() => {
    if (mining.mode && mining.mode !== selectedMode) {
      setSelectedMode(mining.mode);
    }
  }, [mining.mode, selectedMode]);

  // Check lock status on mount and when mining changes
  useEffect(() => {
    const status = MiningModule.getLockStatus();
    setLockStatus(status);
  }, [mining.hasResult]);

  // Load UTXOs from batch config
  useEffect(() => {
    if (batch.selectedUtxos && batch.selectedUtxos.length > 0) {
      // UTXOs already selected in batch config
    }
  }, [batch.selectedUtxos]);

  const handleModeChange = (mode) => {
    setSelectedMode(mode);
    changeMiningMode(mode);
  };

  const handleStartMining = () => {
    startMining();
  };

  const handleStopMining = () => {
    stopMining();
  };

  return (
    <div className="step3-mining">
      <div className="mining-header">
        <h2 className="text-4xl font-bold text-center mb-8 text-purple-400">
           BRO Token Mining
        </h2>
        <p className="text-slate-300 text-center mb-8 text-lg">
          Mine for the perfect hash to maximize your BRO token rewards. 
          The more leading zeros you find, the higher your reward!
        </p>
      </div>

      {/* Lock Warning Message */}
      {lockStatus.isLocked && (
        <div className="bg-amber-900/20 border border-amber-500/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <p className="text-amber-300 font-semibold mb-1">Mining Locked</p>
              <p className="text-amber-200 text-sm">
                {lockStatus.message || 'Mining transaction has been broadcast. Cannot re-mine.'}
              </p>
              {lockStatus.data?.miningTxid && (
                <p className="text-amber-400 text-xs mt-2 font-mono break-all">
                  TX: {lockStatus.data.miningTxid}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mining Controls - Mode Selection + Start/Stop Button */}
      <div className="mining-controls bg-slate-900/60 border border-slate-600 rounded-2xl p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Mining Mode Selection - Left */}
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <span className="text-slate-400 text-sm font-medium">Mining Mode:</span>
            <div className="flex gap-3">
              <button
                onClick={() => handleModeChange('cpu')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  selectedMode === 'cpu'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                � CPU
              </button>
              <button
                onClick={() => handleModeChange('gpu')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  selectedMode === 'gpu'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                � GPU
              </button>
            </div>
          </div>

          {/* Start/Stop Button - Right */}
          <div className="w-full md:w-auto">
            {!mining.isActive ? (
              <button
                onClick={handleStartMining}
                disabled={isProcessing || lockStatus.isLocked}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-8 py-3 transition-all duration-200 shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{mining.currentNonce > 0 ? '▶' : '▶'}</span>
                <span>{mining.currentNonce > 0 ? 'Continue Mining' : 'Start Mining'}</span>
              </button>
            ) : (
              <button
                onClick={handleStopMining}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-8 py-3 transition-all duration-200 shadow-sm text-white bg-red-600 hover:bg-red-700"
              >
                <span>⏹</span>
                <span>Stop Mining</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mining Display */}
      <div className="mining-display bg-slate-900/60 border border-slate-600 rounded-2xl p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Current Nonce */}
          <div className="stat-card bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <div className="text-slate-400 text-sm mb-1">Current Nonce</div>
            <div className="text-slate-200 text-xl font-mono">
              {mining.currentNonce ? mining.currentNonce.toLocaleString() : '0'}
            </div>
          </div>

          {/* Hash Rate */}
          <div className="stat-card bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <div className="text-slate-400 text-sm mb-1">Hash Rate</div>
            <div className="text-blue-300 text-xl font-semibold">
              {formatHashRate(mining.hashRate)}
            </div>
          </div>

          {/* Best Leading Zeros */}
          <div className="stat-card bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <div className="text-slate-400 text-sm mb-1">Leading Zeros</div>
            <div className="text-emerald-300 text-2xl font-bold">
              {mining.bestLeadingZeros || 0}
            </div>
          </div>

          {/* Mining Status */}
          <div className="stat-card bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <div className="text-slate-400 text-sm mb-1">Status</div>
            <div className={`text-lg font-semibold ${mining.isActive ? 'text-green-400' : 'text-slate-400'}`}>
              {mining.isActive ? '⚡ Mining...' : '� Idle'}
            </div>
          </div>
        </div>

        {/* Challenge UTXO Display */}
        <div className="mt-6">
          <div className="text-slate-400 text-sm mb-2">Challenge UTXO:</div>
          <div className="bg-black/30 border border-slate-700 rounded-lg p-4 font-mono text-sm break-all">
            <span className="text-slate-300">
              {mining.challenge || (batch.selectedUtxos && batch.selectedUtxos.length > 0 && batch.selectedUtxos[0] ? `${batch.selectedUtxos[0].txid}:${batch.selectedUtxos[0].vout}` : 'No UTXO selected')}
            </span>
          </div>
        </div>

        {/* Current Hash Display */}
        <div className="mt-4">
          <div className="text-slate-400 text-sm mb-2">Current Hash:</div>
          <div className="bg-black/30 border border-slate-700 rounded-lg p-4 font-mono text-sm break-all">
            <span className="text-slate-300">
              {mining.currentHash || 'Waiting to start mining...'}
            </span>
          </div>
        </div>

      </div>

      {/* Token Reward Display */}
      {mining.hasResult && mining.bestLeadingZeros > 0 && (
        <TokenRewardDisplay mining={mining} />
      )}
    </div>
  );
}
