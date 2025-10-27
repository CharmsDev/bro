/**
 * UtxoFound - Component to display found UTXO (Challenge UTXO)
 * Shows UTXO details when a valid UTXO has been detected
 */
import React from 'react';

export function UtxoFound({ utxo, wallet, onCopyAddress }) {
  return (
    <div className="space-y-4">
      {/* Address Display */}
      <div>
        <div className="text-slate-400 text-sm mb-2">Your Bitcoin Address:</div>
        <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-4 flex items-center gap-4">
          <code className="flex-1 text-slate-200 font-mono text-sm break-all">
            {wallet.address}
          </code>
          <button 
            className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-4 py-2 transition-all duration-200 shadow-sm text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:scale-105 hover:shadow-lg"
            onClick={onCopyAddress}
            title="Copy address"
          >
            <span>📋</span>
          </button>
        </div>
      </div>

      {/* UTXO Found Box */}
      <div className="bg-emerald-900/20 border border-emerald-600/50 rounded-xl p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <h3 className="text-lg font-semibold text-emerald-400">Challenge UTXO Selected</h3>
        </div>
        
        {/* UTXO Details */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 items-center">
        {/* Transaction ID */}
        <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3 min-w-0">
          <div className="text-slate-400 text-xs mb-1">Transaction ID</div>
          <code className="text-emerald-400 font-mono text-xs break-all">
            {utxo.txid}
          </code>
        </div>
        
        {/* Output */}
        <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3">
          <div className="text-slate-400 text-xs mb-1">Output</div>
          <div className="text-slate-200 font-semibold">
            {utxo.vout}
          </div>
        </div>
        
        {/* Amount */}
        <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3">
          <div className="text-slate-400 text-xs mb-1">Amount</div>
          <div className="text-emerald-400 font-semibold">
            {utxo.value?.toLocaleString()} sats
          </div>
        </div>
        
        {/* Confirmations (if > 0) */}
        {utxo.confirmations > 0 && (
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3">
            <div className="text-slate-400 text-xs mb-1">Confirmations</div>
            <div className="text-slate-200 font-semibold">
              {utxo.confirmations}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
