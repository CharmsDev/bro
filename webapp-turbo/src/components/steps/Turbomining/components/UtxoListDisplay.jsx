import React from 'react';
import { formatSatoshis } from '../../../../utils/formatters.js';

export function UtxoListDisplay({ walletUtxos, isScanning, scanError, maxAffordable = 0 }) {
  if (isScanning) {
    return (
      <div className="bg-blue-900/20 border border-blue-600/50 rounded-2xl p-8 backdrop-blur-md shadow-sm mb-8">
        <h4 className="text-2xl font-bold text-blue-400 mb-6 text-center flex items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span> Scanning Wallet UTXOs...</span>
        </h4>
        <div className="text-center text-slate-400">
          Scanning all wallet addresses for available funds...
        </div>
      </div>
    );
  }

  if (scanError) {
    return (
      <div className="bg-red-900/20 border border-red-600/50 rounded-2xl p-8 backdrop-blur-md shadow-sm mb-8">
        <h4 className="text-2xl font-bold text-red-400 mb-6 text-center flex items-center justify-center gap-2">
          <span></span>
          <span>UTXO Scan Error</span>
        </h4>
        <div className="text-center text-red-300 mb-4">
          {scanError}
        </div>
        <div className="text-center">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            � Retry Scan
          </button>
        </div>
      </div>
    );
  }

  if (!walletUtxos || !walletUtxos.available || walletUtxos.available.length === 0) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-2xl p-8 backdrop-blur-md shadow-sm mb-8">
        <h4 className="text-2xl font-bold text-yellow-400 mb-6 text-center flex items-center justify-center gap-2">
          <span></span>
          <span>No Available UTXOs</span>
        </h4>
        <div className="text-center text-yellow-300 mb-4">
          No spendable UTXOs found in your wallet. You need Bitcoin to create Turbomining transactions.
        </div>
        <div className="text-center text-slate-400 text-sm">
          Make sure your wallet has sufficient Bitcoin balance (minimum 340 sats per output).
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-600/50 rounded-2xl p-8 backdrop-blur-md shadow-sm mb-8">
      <h4 className="text-2xl font-bold text-slate-200 mb-6 text-center flex items-center justify-center gap-2">
        <span></span>
        <span>Available UTXOs & Funds</span>
      </h4>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-lg p-4 text-center">
          <div className="text-emerald-400 text-sm mb-1">Total Available</div>
          <div className="text-emerald-300 text-2xl font-bold">
            {formatSatoshis(walletUtxos.totalValue)}
          </div>
        </div>
        
        <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 text-center">
          <div className="text-blue-400 text-sm mb-1">Available UTXOs</div>
          <div className="text-blue-300 text-2xl font-bold">
            {walletUtxos.available.length}
          </div>
        </div>
        
        <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-4 text-center">
          <div className="text-purple-400 text-sm mb-1">Max Outputs</div>
          <div className="text-purple-300 text-2xl font-bold">
            {maxAffordable || '...'}
          </div>
        </div>
      </div>

      {/* UTXO List */}
      <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
        <div className="text-slate-300 text-sm mb-3 flex items-center justify-between">
          <span>UTXO Details:</span>
          <span className="text-xs text-slate-500">
            {walletUtxos.excluded?.length || 0} UTXOs excluded (dust/fees/ordinals)
          </span>
        </div>
        
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {walletUtxos.available.map((utxo, index) => (
            <div 
              key={`${utxo.txid}:${utxo.vout}-${index}`}
              className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-lg text-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="text-slate-300 font-mono text-xs truncate">
                  {utxo.txid}:{utxo.vout}
                </div>
                <div className="text-slate-500 text-xs">
                  {utxo.address?.substring(0, 20)}...
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-emerald-300 font-semibold">
                  {formatSatoshis(utxo.value)}
                </div>
                <div className="text-slate-500 text-xs">
                  {utxo.confirmations || 0} conf
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Information */}
      <div className="mt-4 p-3 bg-slate-800/30 border border-slate-600 rounded-lg">
        <div className="text-slate-400 text-xs text-center">
          � <strong>Turbomining Cost:</strong> 333 sats per output + dynamic network fee (calculated in real-time)
        </div>
      </div>
    </div>
  );
}
