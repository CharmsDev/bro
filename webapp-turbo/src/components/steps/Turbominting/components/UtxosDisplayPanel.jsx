import { PROTECTED_VALUES_ARRAY } from '../../../../services/utxo/protected-values.js';

// Display component for available and resulting UTXOs
export function UtxosDisplayPanel({ 
  availableUtxos = [],
  resultingUtxos = [],
  analysis = null,
  isScanning = false
}) {
  // [RJJ-DEBUG] Log what we're receiving
  console.log('[RJJ-DEBUG] UtxosDisplayPanel props:', {
    availableUtxos: availableUtxos.length,
    resultingUtxos: resultingUtxos.length,
    analysis: analysis?.strategy
  });
  
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-slate-300 font-semibold mb-3 flex items-center gap-2">
          <span>📦</span>
          <span>Available UTXOs</span>
          <span className="text-slate-500 text-sm">
            ({availableUtxos.length})
          </span>
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {availableUtxos.length > 0 ? (
            availableUtxos.map((utxo, idx) => {
              const isProtected = PROTECTED_VALUES_ARRAY.includes(utxo.value);
              const isSelected = analysis?.utxosToUse?.some(
                u => u.txid === utxo.txid && u.vout === utxo.vout
              );
              
              if (isProtected) return null;
              
              return (
                <div key={idx} className={`p-2 rounded text-xs ${
                  isSelected
                    ? 'bg-emerald-900/30 border border-emerald-500'
                    : utxo.value >= 5000 
                    ? 'bg-slate-700/50 border border-slate-600' 
                    : 'bg-slate-700/30 border border-slate-600'
                }`}>
                  <div className="flex justify-between items-center">
                    <code className="text-slate-400">
                      {utxo.txid.substring(0, 12)}...:{utxo.vout}
                    </code>
                    <span className={isSelected ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                      {utxo.value.toLocaleString()} sats
                    </span>
                  </div>
                  {isSelected && (
                    <div className="text-emerald-400 text-xs mt-1">✓ Selected</div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-slate-500 text-sm">No UTXOs available</div>
          )}
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-slate-300 font-semibold mb-3 flex items-center gap-2">
          <span>🎯</span>
          <span>Resulting UTXOs</span>
          <span className="text-slate-500 text-sm">
            ({resultingUtxos.length})
          </span>
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {resultingUtxos.length > 0 ? (
            <>
              {resultingUtxos.map((utxo, idx) => {
                const sourceColor = 
                  analysis?.isPartial ? 'amber' :
                  utxo.source === 'funding_tx' ? 'blue' :
                  utxo.source === 'theoretical' ? 'purple' :
                  'emerald';
                
                return (
                  <div key={idx} className={`p-2 rounded text-xs ${
                    sourceColor === 'amber' ? 'bg-amber-900/20 border border-amber-600/30' :
                    sourceColor === 'blue' ? 'bg-blue-900/20 border border-blue-600/30' :
                    sourceColor === 'purple' ? 'bg-purple-900/20 border border-purple-600/30' :
                    'bg-emerald-900/20 border border-emerald-600/30'
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      {utxo.txid ? (
                        <code className="text-slate-400">
                          {utxo.txid.substring(0, 12)}...:{utxo.vout}
                        </code>
                      ) : (
                        <span className="text-slate-300">
                          {utxo.type === 'minting' ? '🎯' : utxo.type === 'change' ? '💰' : '📦'} Output #{idx + 1}
                        </span>
                      )}
                      <span className={`font-semibold ${
                        sourceColor === 'amber' ? 'text-amber-400' :
                        sourceColor === 'blue' ? 'text-blue-400' :
                        sourceColor === 'purple' ? 'text-purple-400' :
                        'text-emerald-400'
                      }`}>
                        {utxo.value.toLocaleString()} sats
                      </span>
                    </div>
                    <div className="text-slate-500 text-xs flex items-center gap-1">
                      {utxo.source === 'existing' ? (
                        <>📦 Existing wallet UTXO</>
                      ) : utxo.source === 'funding_tx' ? (
                        <>{utxo.type === 'minting' ? '🎯 From funding TX (minting)' : '💰 From funding TX (change)'}</>
                      ) : utxo.source === 'theoretical' ? (
                        <>🔮 Will be created by funding TX</>
                      ) : (
                        <>🆕 New output</>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-slate-500 text-sm mb-2">
                {isScanning ? (
                  <>🔄 Analyzing...</>
                ) : analysis?.canAfford === 0 ? (
                  <>❌ No outputs available</>
                ) : (
                  <>⏳ Waiting for analysis...</>
                )}
              </div>
              {analysis?.canAfford === 0 && (
                <p className="text-slate-600 text-xs">
                  Add more funds to your wallet to start minting
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
