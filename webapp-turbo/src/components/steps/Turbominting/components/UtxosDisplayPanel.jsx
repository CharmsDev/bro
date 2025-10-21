import { PROTECTED_VALUES_ARRAY } from '../../../../services/utxo/protected-values.js';

/**
 * UtxosDisplayPanel - Pure presentation component for UTXO lists
 * 
 * Displays two panels:
 * - Available UTXOs (📦): UTXOs in wallet that can be used
 * - Resulting UTXOs (🎯): UTXOs that will be used for minting
 * 
 * @param {Array} availableUtxos - Available UTXOs from wallet
 * @param {Array} resultingUtxos - Resulting UTXOs (existing, theoretical, or from funding TX)
 * @param {Object} analysis - Funding analysis result
 * @param {boolean} isScanning - Whether currently scanning
 */
export function UtxosDisplayPanel({ 
  availableUtxos = [],
  resultingUtxos = [],
  analysis = null,
  isScanning = false
}) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* Left: Available UTXOs */}
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

      {/* Right: Resulting UTXOs */}
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
              {/* Header with status */}
              <div className={`rounded p-2 mb-2 ${
                analysis?.isPartial 
                  ? 'bg-amber-900/20 border border-amber-600/30'
                  : 'bg-emerald-900/20 border border-emerald-600/30'
              }`}>
                <p className={`text-xs font-semibold ${
                  analysis?.isPartial ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {analysis?.isPartial 
                    ? `⚠️ Partial: ${analysis.canAfford || resultingUtxos.length} outputs`
                    : '✅ Ready to mint'}
                </p>
              </div>
              
              {/* UTXO List */}
              {resultingUtxos.map((utxo, idx) => (
                <div key={idx} className={`p-2 rounded text-xs ${
                  analysis?.isPartial
                    ? 'bg-amber-900/20 border border-amber-600/30'
                    : utxo.source === 'funding_tx'
                    ? 'bg-blue-900/20 border border-blue-600/30'
                    : 'bg-emerald-900/20 border border-emerald-600/30'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    {utxo.txid ? (
                      <code className="text-slate-400">
                        {utxo.txid.substring(0, 12)}...:{utxo.vout}
                      </code>
                    ) : (
                      <span className="text-slate-300">
                        {utxo.type === 'minting' ? '🎯' : '💰'} UTXO #{idx + 1}
                      </span>
                    )}
                    <span className={`font-semibold ${
                      analysis?.isPartial ? 'text-amber-400' : 
                      utxo.source === 'funding_tx' ? 'text-blue-400' : 
                      'text-emerald-400'
                    }`}>
                      {utxo.value.toLocaleString()} sats
                    </span>
                  </div>
                  <div className="text-slate-500 text-xs">
                    {utxo.source === 'new' ? 'New output' :
                     utxo.source === 'funding_tx' ? 
                       (utxo.type === 'minting' ? 'Minting output' : 'Change output') :
                     `Origin: Existing UTXO (${utxo.value.toLocaleString()} sats)`}
                  </div>
                </div>
              ))}
            </>
          ) : isScanning ? (
            <div className="text-slate-500 text-sm">Analyzing...</div>
          ) : (
            <div className="text-slate-500 text-sm">No outputs</div>
          )}
        </div>
      </div>
    </div>
  );
}
