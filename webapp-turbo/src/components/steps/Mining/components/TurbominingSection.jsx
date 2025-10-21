import React, { useState } from 'react';
import { useTurbomining } from '../../../../hooks/useTurbomining.js';
import { formatSatoshis } from '../../../../utils/formatters.js';

export function TurbominingSection({ bestHash, bestNonce, bestLeadingZeros }) {
  const [txDisplayFormat, setTxDisplayFormat] = useState('json');
  
  // Create mining result object for the hook
  const miningResult = { nonce: bestNonce, hash: bestHash, leadingZeros: bestLeadingZeros };

  // Use the shared turbomining hook
  const {
    selectedOutputs,
    setSelectedOutputs,
    walletUtxos,
    isScanning,
    scanError,
    generatedTransaction,
    isGeneratingTx,
    txError,
    getMaxAffordableOutputs,
    checkOutputAffordable,
    getTotalCost,
    generateTransactionJSON,
    outputOptions,
    costPerOutput,
    feePerOutput
  } = useTurbomining(miningResult);

  return (
    <div className="bg-slate-900/60 border border-purple-600/50 rounded-2xl p-8 backdrop-blur-md shadow-sm mt-8">
      <h4 className="text-3xl font-bold text-purple-400 mb-6 text-center flex items-center justify-center gap-2">
        <span>⚡</span>
        <span>Turbomining</span>
      </h4>
      
      <p className="text-slate-300 text-center mb-8 text-lg">
        Leverage your successful hash to create multiple outputs in a single transaction.
      </p>

      {/* Output Selection Grid */}
      <div className="mb-8">
        <h5 className="text-xl font-semibold text-slate-200 mb-4 text-center">Select Number of Outputs:</h5>
        
        {walletUtxos && (
          <div className="mb-4 p-3 bg-slate-800/50 border border-slate-600 rounded-lg text-center">
            <div className="text-sm text-slate-400 mb-1">
              Available Funds: <span className="text-emerald-300 font-semibold">{formatSatoshis(walletUtxos.totalValue)}</span>
            </div>
            <div className="text-sm text-slate-400">
              Max Affordable: <span className="text-purple-300 font-semibold">{getMaxAffordableOutputs()} outputs</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {outputOptions.map((outputs) => {
            const isAffordable = checkOutputAffordable(outputs);
            const totalCost = getTotalCost(outputs);
            
            return (
              <button
                key={outputs}
                onClick={() => isAffordable && setSelectedOutputs(outputs)}
                disabled={!isAffordable}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-center relative ${
                  selectedOutputs === outputs
                    ? 'border-purple-500 bg-purple-900/30 text-purple-300 shadow-lg'
                    : isAffordable
                    ? 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-purple-600/50 hover:bg-purple-900/10'
                    : 'border-red-600/50 bg-red-900/20 text-red-400 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="text-2xl font-bold">{outputs}</div>
                <div className="text-xs text-slate-400">outputs</div>
                <div className="text-xs mt-1">{formatSatoshis(totalCost)}</div>
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

      {/* Transaction Preview */}
      {selectedOutputs && generatedTransaction && !isGeneratingTx && (
        <div className="bg-slate-800/30 border border-slate-600 rounded-xl p-6 mb-6">
          <h5 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <span>⚙</span>
            <span>Turbomining Transaction</span>
            <span className="text-xs bg-emerald-600/20 text-emerald-300 px-2 py-1 rounded"> Generated</span>
          </h5>

          <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Transaction Data:</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setTxDisplayFormat('json')}
                  className={`text-xs px-3 py-1 rounded transition-colors ${
                    txDisplayFormat === 'json' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  JSON
                </button>
                <button 
                  onClick={() => setTxDisplayFormat('hex')}
                  className={`text-xs px-3 py-1 rounded transition-colors ${
                    txDisplayFormat === 'hex' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  HEX
                </button>
              </div>
            </div>
            
            <div className="bg-black/30 border border-slate-700 rounded p-4 font-mono text-xs text-slate-300 max-h-80 overflow-y-auto">
              {txDisplayFormat === 'json' ? (
                <div>
                  <div className="text-emerald-400 mb-2">// Turbomining Transaction JSON ({generatedTransaction.numberOfOutputs} outputs)</div>
                  <pre className="text-slate-300 whitespace-pre-wrap">
                    {JSON.stringify(generateTransactionJSON(), null, 2)}
                  </pre>
                </div>
              ) : (
                <div>
                  <div className="text-emerald-400 mb-2">// Turbomining Transaction HEX ({generatedTransaction.size} bytes)</div>
                  <div className="text-slate-300 break-all leading-relaxed">{generatedTransaction.hex}</div>
                </div>
              )}
            </div>
            
            <div className="mt-3 flex justify-between items-center">
              <div className="text-xs text-slate-500">
                {txDisplayFormat === 'json' ? 'Structured transaction data' : 'Raw hex for broadcast'}
              </div>
              <button
                onClick={() => {
                  const textToCopy = txDisplayFormat === 'json' 
                    ? JSON.stringify(generateTransactionJSON(), null, 2)
                    : generatedTransaction.hex;
                  navigator.clipboard.writeText(textToCopy);
                }}
                className="text-xs px-2 py-1 bg-slate-600 text-slate-300 rounded hover:bg-slate-500 transition-colors"
              >
                � Copy {txDisplayFormat.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {selectedOutputs && (
        <div className="mt-8 text-center">
          {generatedTransaction && !isGeneratingTx ? (
            <button
              onClick={() => alert(`Ready to broadcast Turbomining transaction!\nTXID: ${generatedTransaction.txid}`)}
              className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-8 py-4 transition-all duration-200 shadow-sm text-white bg-purple-600 hover:bg-purple-700"
            >
              <span></span>
              <span>Broadcast Turbomining Transaction</span>
              <span className="text-xs">({generatedTransaction.numberOfOutputs} outputs)</span>
            </button>
          ) : isGeneratingTx ? (
            <button disabled className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-8 py-4 text-white bg-blue-600/50 cursor-not-allowed opacity-60">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Generating Transaction...</span>
            </button>
          ) : (
            <button disabled className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-8 py-4 text-white bg-purple-600/50 cursor-not-allowed opacity-60">
              <span>⚡</span>
              <span>Select Outputs to Generate Transaction</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
