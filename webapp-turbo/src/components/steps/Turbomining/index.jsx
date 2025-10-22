// Turbomining - Create turbomining transaction with multiple spendable outputs
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store/index.js';
import { StepContainer } from '../../common/StepContainer.jsx';
import { useTurbomining } from '../../../hooks/useTurbomining.js';
import { TransactionDisplay } from './components/TransactionDisplay.jsx';
import { UtxoListDisplay } from './components/UtxoListDisplay.jsx';
import { CostSummary } from './components/CostSummary.jsx';
import { calculateRewardInfo } from '../../../services/mining/RewardCalculator.js';
import { formatSatoshis } from '../../../utils/formatters.js';
import TurbominingModule from '../../../modules/turbomining/TurbominingModule.js';
import './Turbomining.css';

export function Turbomining() {
  const { mining } = useStore();
  const [txDisplayFormat, setTxDisplayFormat] = useState('json');
  const [savedTurbomining, setSavedTurbomining] = useState(null);
  const navigate = useNavigate();
  
  // Component loaded - silent
  
  const miningResult = useMemo(() => {
    if (!mining.hasResult || (!mining.bestHash && !mining.result?.hash)) {
      return null;
    }
    
    const result = {
      nonce: mining.bestNonce || mining.result?.nonce || 0,
      hash: mining.bestHash || mining.result?.hash || '',
      leadingZeros: mining.bestLeadingZeros || mining.result?.leadingZeros || 0
    };
    
    return result;
  }, [mining.hasResult, mining.bestHash, mining.bestNonce, mining.bestLeadingZeros, mining.result]);

  // Get lock status BEFORE using the hook
  const lockStatus = TurbominingModule.getLockStatus();
  const isLocked = lockStatus.isLocked;

  // Use the shared turbomining hook (pass isLocked to prevent scanning when locked)
  const {
    selectedOutputs,
    setSelectedOutputs,
    walletUtxos,
    isScanning,
    scanError,
    generatedTransaction,
    isGeneratingTx,
    txError,
    broadcastTransaction,
    getMaxAffordableOutputs,
    checkOutputAffordable,
    getTotalCost,
    generateTransactionJSON,
    outputOptions,
    costPerOutput,
    feePerOutput
  } = useTurbomining(miningResult, isLocked);

  // Load persisted turbomining data on mount (recover selection and lock state)
  useEffect(() => {
    const saved = TurbominingModule.load();
    
    // Debug: Show localStorage data clearly
    if (saved) {
    }
    
    // CRITICAL: Clear any data that doesn't have miningTxid (not broadcast yet)
    if (saved && !saved.miningTxid) {
      import('../../../modules/turbomining/TurbominingModule.js').then(({ default: TurbominingModule }) => {
        TurbominingModule.clear();
        window.location.reload();
      });
      return; // Exit early, don't restore anything
    }
    
    // ONLY restore if transaction was actually broadcast (has miningTxid)
    if (saved && saved.miningTxid) {
      setSavedTurbomining(saved);
      if (!selectedOutputs && saved.numberOfOutputs) {
        setSelectedOutputs(saved.numberOfOutputs);
      }
    }
  }, []);

  // Build a display-friendly transaction from saved data if hook hasn't generated one
  const displayTransaction = generatedTransaction || (savedTurbomining ? {
    totalOutputs: savedTurbomining.numberOfOutputs,
    spendableOutputs: savedTurbomining.spendableOutputs || [],
    miningData: savedTurbomining.miningData,
    signedTxHex: savedTurbomining.signedTxHex,
    txid: savedTurbomining.miningTxid,
    totalCost: savedTurbomining.totalCost,
    size: savedTurbomining.size || 0,
    fee: savedTurbomining.fee || 0,
  } : null);

  // Calculate token reward using exact BRO contract formula
  const calculateTokenReward = () => {
    if (!mining.bestHash || !mining.bestLeadingZeros || mining.bestLeadingZeros === 0) return "0";
    
    try {
      const rewardInfo = calculateRewardInfo(mining.bestNonce || 0, mining.bestHash);
      return rewardInfo.formattedAmount;
    } catch (error) {
      return "0";
    }
  };

  // Format hash with leading zeros highlighting
  const formatHashDisplay = (hash) => {
    if (!hash || hash === 'Calculating...' || hash === 'Waiting to start...' || hash === 'No best hash yet...' || hash === 'Searching for best hash...') {
      return <span className="hash-remainder text-slate-300">{hash}</span>;
    }

    // Leading zeros count is in BITS, but hash is HEXADECIMAL
    // Each hex character = 4 bits, so divide by 4 to get hex zeros
    const leadingZerosCount = mining.bestLeadingZeros || 0;
    const zerosToShow = Math.floor(leadingZerosCount / 4);
    const leadingZerosStr = '0'.repeat(zerosToShow);
    const remainder = hash.slice(zerosToShow);

    return (
      <>
        <span className="leading-zeros text-emerald-400 font-bold">{leadingZerosStr}</span>
        <span className="hash-remainder text-slate-300">{remainder}</span>
      </>
    );
  };

  // Check if we have mining results
  if (!mining.hasResult || !mining.bestLeadingZeros || mining.bestLeadingZeros === 0) {
    return (
      <div className="step3-turbomining">
        <div className="text-center py-16">
          <h2 className="text-4xl font-bold text-purple-400 mb-6">⚡ Turbomining</h2>
          <div className="bg-slate-900/60 border border-slate-600 rounded-2xl p-8 max-w-2xl mx-auto">
            <div className="text-6xl mb-4"></div>
            <h3 className="text-xl font-semibold text-slate-200 mb-4">Mining Required</h3>
            <p className="text-slate-400 mb-6">
              You need to complete the mining process first to access Turbomining.
              Go back to Step 2 and find a successful hash with leading zeros.
            </p>
            <div className="text-sm text-slate-500">
              Turbomining allows you to create multiple BRO token outputs using your successful mining result.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="step3-turbomining">
      <div className="turbomining-header">
        <h2 className="text-4xl font-bold text-center mb-8 text-purple-400">
          ⚡ Turbomining
        </h2>
        <p className="text-slate-300 text-center mb-8 text-lg">
          Leverage your successful mining result to create multiple BRO token outputs in a single transaction.
        </p>
      </div>

      {/* Mining Result Summary - Compact */}
      <div className="bg-emerald-900/20 border border-emerald-600/50 rounded-2xl p-6 backdrop-blur-md shadow-sm mb-8">
        <div className="flex items-start justify-between gap-6">
          {/* Left: Mining Data */}
          <div className="flex-1 space-y-3">
            <h4 className="text-lg font-bold text-emerald-400 mb-3"> Mining Result</h4>
            
            {/* Hash */}
            <div>
              <div className="text-slate-400 text-xs mb-1">Best Hash Found:</div>
              <div className="font-mono text-xs break-all">
                {formatHashDisplay(mining.bestHash)}
              </div>
            </div>
            
            {/* Nonce */}
            <div>
              <div className="text-slate-400 text-xs mb-1">Nonce:</div>
              <div className="text-slate-200 text-sm font-mono">{(mining.bestNonce || 0).toLocaleString()}</div>
            </div>
          </div>

          {/* Right: BRO Token Reward */}
          <div className="text-right bg-emerald-900/30 border border-emerald-600/50 rounded-xl px-6 py-4 min-w-[280px]">
            <div className="text-emerald-400 text-xs font-medium mb-2">BASE BRO TOKENS TO TURBO MINT</div>
            <div className="flex items-baseline justify-end gap-3 mb-2">
              <div className="text-4xl font-bold text-emerald-300">
                {calculateTokenReward()}
              </div>
              <div className="text-emerald-400 text-lg font-semibold">$BRO</div>
            </div>
            <div className="flex items-center justify-end gap-2 text-slate-300 text-sm">
              <span className="text-slate-400 text-xs">Leading Zeros:</span>
              <span className="text-emerald-300 font-bold">{mining.bestLeadingZeros}</span>
            </div>
          </div>
        </div>
      </div>

      {/* UTXO List & Available Funds - Hide when locked */}
      {!isLocked && (
        <UtxoListDisplay 
          walletUtxos={walletUtxos}
          isScanning={isScanning}
          scanError={scanError}
        />
      )}

      {/* Output Selection with Total BRO Tokens */}
      <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-slate-200 mb-1">� Select Number of Outputs</h3>
            <p className="text-slate-400 text-sm">
              Each output will create a separate spendable UTXO of 333 sats for BRO token minting.
            </p>
          </div>
          
          {/* Total BRO Tokens Display - Top Right */}
          {selectedOutputs > 0 && (
            <div className="ml-6 text-right bg-gradient-to-br from-emerald-900/40 to-blue-900/40 border border-emerald-500/50 rounded-xl px-6 py-3 min-w-[240px]">
              <div className="text-emerald-400 text-xs font-medium mb-1">TOTAL TO MINT</div>
              <div className="flex items-baseline justify-end gap-2">
                <div className="text-4xl font-bold text-emerald-300">
                  {(parseFloat(calculateTokenReward()) * selectedOutputs).toLocaleString()}
                </div>
                <div className="text-emerald-400 text-lg font-semibold">$BRO</div>
              </div>
            </div>
          )}
          
          {/* Lock Status */}
          {isLocked && lockStatus.message && !selectedOutputs && (
            <div className="ml-6 flex items-center gap-2 px-3 py-1.5 bg-emerald-900/30 border border-emerald-600/50 rounded-lg">
              <span className="text-emerald-400 text-sm">�</span>
              <span className="text-emerald-300 text-sm font-medium">{lockStatus.message}</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {outputOptions.map((outputs) => {
            const isAffordable = checkOutputAffordable(outputs);
            const totalCost = getTotalCost(outputs);
            
            return (
              <button
                key={outputs}
                onClick={() => !isLocked && isAffordable && setSelectedOutputs(outputs)}
                disabled={!isAffordable || isLocked}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-center relative ${
                  (selectedOutputs === outputs || (isLocked && savedTurbomining?.numberOfOutputs === outputs))
                    ? 'border-purple-500 bg-purple-900/30 text-purple-300 shadow-lg'
                    : isAffordable
                    ? 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-purple-600/50 hover:bg-purple-900/10'
                    : 'border-red-600/50 bg-red-900/20 text-red-400 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="text-2xl font-bold">{outputs}</div>
                <div className="text-xs text-slate-400">outputs</div>
                {isLocked && savedTurbomining?.numberOfOutputs === outputs && (
                  <div className="absolute top-1 right-1 text-emerald-400" title="Locked after transaction created/broadcasted">
                    <span className="text-xs">�</span>
                  </div>
                )}
                {!isAffordable && (
                  <div className="absolute top-1 right-1 text-red-400">
                    <span className="text-xs"></span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cost Summary - Show when outputs selected */}
      {selectedOutputs > 0 && (
        <CostSummary 
          selectedOutputs={selectedOutputs}
          miningTxCost={getTotalCost(selectedOutputs)}
          walletUtxos={walletUtxos}
          isLocked={isLocked}
        />
      )}

      {/* Transaction Display */}
      <TransactionDisplay 
        generatedTransaction={displayTransaction}
        isGeneratingTx={isGeneratingTx}
        txError={txError}
      />
    </div>
  );
}
