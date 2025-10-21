import { useState, useEffect } from 'react';
import { getFeeEstimator } from '../../../../services/bitcoin/fee-estimator.js';
import { MempoolButton } from './MempoolButton.jsx';
import { UtxosDisplayPanel } from './UtxosDisplayPanel.jsx';

export function FundingBroadcastBox({ 
  funding,
  fundingTxid,
  fundingExplorerUrl,
  fundingTxConfirmed,
  onBroadcast, 
  isBroadcasting, 
  broadcastError 
}) {
  const [activeTab, setActiveTab] = useState('utxos');
  const [dynamicFee, setDynamicFee] = useState(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);

  // Calculate dynamic fee when transaction is available
  useEffect(() => {
    if (!funding.transaction || funding.needsFunding === false) {
      return;
    }

    const calculateFee = async () => {
      setIsCalculatingFee(true);
      try {
        const feeEstimator = getFeeEstimator();
        const numInputs = funding.transaction.inputUtxos?.length || 1;
        const numOutputs = funding.transaction.outputs?.length || 2;
        const fee = await feeEstimator.calculateFee(numInputs, numOutputs);
        setDynamicFee(fee);
      } catch (error) {
      } finally {
        setIsCalculatingFee(false);
      }
    };

    calculateFee();
  }, [funding.transaction, funding.needsFunding]);

  return (
    <div className="box-section bg-slate-900/60 border border-slate-600 rounded-2xl p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-2xl font-bold text-purple-300">
          📤 3. Funding Transaction Broadcast
        </h3>
        {/* Top-right Dynamic Fee badge */}
        {funding.transaction && funding.needsFunding !== false && (
          <div className="bg-slate-800/70 border border-slate-600 rounded-lg px-4 py-2 flex items-center gap-3">
            <span className="text-slate-300 text-sm font-semibold">Fee:</span>
            {isCalculatingFee ? (
              <span className="text-slate-400 text-sm">Calculating...</span>
            ) : (
              <span className="text-emerald-400 text-base font-semibold">{(dynamicFee ?? 0).toLocaleString()} sats</span>
            )}
          </div>
        )}
      </div>
      <div className="box-content">
        {/* Case 0: Analysis not complete yet */}
        {!funding.analysis ? (
          <div className="bg-slate-800/50 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <span className="text-purple-400">Waiting for funding analysis...</span>
            </div>
            <p className="text-slate-500 text-sm">
              Analyzing available UTXOs to determine funding requirements
            </p>
          </div>
        ) : fundingTxid ? (
          <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-emerald-400">
                ✅ Funding TX Broadcasted
              </p>
            </div>
            <div className="bg-slate-900/50 rounded p-3 mb-3">
              <div className="text-xs text-slate-400 mb-1">Transaction ID:</div>
              <code className="text-slate-300 text-xs break-all">{fundingTxid}</code>
            </div>
            <MempoolButton 
              txid={fundingTxid}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-500 hover:border-slate-400 text-slate-300 hover:text-slate-200 rounded-lg font-semibold text-sm transition-colors"
            />
          </div>
        ) : funding.needsFunding === false ? (
          <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-6 text-center">
            <p className="text-emerald-400 font-semibold mb-2">✅ Funding transaction not needed</p>
            <p className="text-slate-400 text-sm">
              Sufficient UTXOs already available for minting process
            </p>
          </div>
        ) : funding.isCreating ? (
          <div className="bg-slate-800/50 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <span className="text-purple-400">Creating funding transaction...</span>
            </div>
          </div>
        ) : !funding.transaction ? (
          <div className="bg-slate-800/50 rounded-lg p-6 text-center">
            <p className="text-slate-500">Waiting for analysis to complete...</p>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex justify-center mb-6">
              <div className="flex bg-slate-800/50 rounded-lg p-1">
                {['utxos', 'json', 'hex'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-slate-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab === 'utxos' && '📦 UTXO Analysis'}
                    {tab === 'json' && '📋 JSON'}
                    {tab === 'hex' && '🔤 HEX'}
                  </button>
                ))}
              </div>
            </div>

            {/* UTXO Analysis Tab */}
            {activeTab === 'utxos' && (
              <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 mb-4">
                <UtxosDisplayPanel 
                  availableUtxos={funding.availableUtxos}
                  resultingUtxos={funding.resultingUtxos}
                  analysis={funding.analysis}
                  isScanning={false}
                />
              </div>
            )}

            {/* JSON Tab */}
            {activeTab === 'json' && (
              <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 mb-4">
                <div className="text-slate-300 text-sm mb-2">Transaction JSON (Decoded):</div>
                <pre className="text-xs text-slate-400 font-mono overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {JSON.stringify(funding.transaction.decoded, null, 2)}
                </pre>
              </div>
            )}

            {/* HEX Tab */}
            {activeTab === 'hex' && (
              <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 mb-4">
                <div className="text-slate-300 text-sm mb-2">Signed Transaction Hex:</div>
                <div className="bg-slate-900/50 border border-slate-700 rounded p-3">
                  <code className="text-xs text-slate-400 font-mono break-all">
                    {funding.transaction.signedHex}
                  </code>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  TXID: {funding.transaction.txid}
                </div>
              </div>
            )}

            

            {/* Broadcast Error */}
            {broadcastError && (
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-4">
                <p className="text-red-400 text-sm">❌ {broadcastError}</p>
              </div>
            )}

            {/* Broadcast Button */}
            {!fundingTxid && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={onBroadcast}
                  disabled={isBroadcasting}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                    isBroadcasting
                      ? 'bg-slate-600 text-slate-300 cursor-wait'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {isBroadcasting ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Broadcasting...
                    </span>
                  ) : (
                    '🚀 Just Broadcast It BRO!'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
