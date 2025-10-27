/**
 * RecoveryMode - Component for mining transaction recovery flow
 * Scans wallet for existing mining TXs and allows recovery
 */
import React from 'react';
import { environmentConfig } from '../../../../config/environment.js';

export function RecoveryMode({
  wallet,
  miningTxs,
  isScanning,
  scanError,
  hasResults,
  isLoadingRecovery,
  onRecoverMiningTx,
  onCopyAddress
}) {
  return (
    <div className="bg-purple-900/20 border border-purple-600/50 rounded-xl p-6">
      <p className="text-slate-300 text-sm mb-4">
        Scanning wallet <code className="text-purple-300 font-mono text-xs">{wallet.address}</code> for mining transactions...
      </p>
        
        {/* Scanning State */}
        {isScanning && (
          <div className="bg-purple-800/30 border border-purple-600/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-5 h-5 border-2 border-purple-300/30 border-t-purple-400 rounded-full animate-spin"></div>
              <span className="text-purple-300 font-semibold">Scanning wallet for mining transactions...</span>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {scanError && !isScanning && (
          <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4">
            <p className="text-red-300 text-sm">
              <strong>Error:</strong> {scanError}
            </p>
          </div>
        )}
        
        {/* Mining TXs List */}
        {!isScanning && hasResults && (
          <div className="space-y-3">
            {miningTxs.map((tx) => (
              <div 
                key={tx.txid}
                className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 hover:border-purple-500/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* TX Info */}
                  <div className="flex-1 min-w-0">
                    {/* TXID */}
                    <div className="mb-3">
                      <div className="text-slate-400 text-xs mb-1">Transaction ID</div>
                      <a 
                        href={environmentConfig.getExplorerUrl(tx.txid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 font-mono text-xs break-all underline decoration-dotted transition-colors"
                      >
                        {tx.txid}
                      </a>
                    </div>
                    
                    {/* Stats Row 1: Outputs */}
                    <div className="flex flex-wrap gap-3 text-sm mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Total Outputs:</span>
                        <span className="text-slate-200 font-semibold">{tx.totalOutputs}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400">✓ Spent:</span>
                        <span className="text-emerald-300 font-semibold">{tx.spentOutputs}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-orange-400">⚡ Unspent:</span>
                        <span className="text-orange-300 font-semibold">{tx.unspentOutputs}</span>
                      </div>
                    </div>
                    
                    {/* Stats Row 2: Financial & Block */}
                    <div className="flex flex-wrap gap-3 text-sm">
                      {tx.amountSpent !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">💰 Spent:</span>
                          <span className="text-blue-300 font-semibold">{tx.amountSpent.toLocaleString()} sats</span>
                        </div>
                      )}
                      {tx.fee !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">⚙️ Fee:</span>
                          <span className="text-amber-300 font-semibold">{tx.fee.toLocaleString()} sats</span>
                        </div>
                      )}
                      {tx.blockHeight && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">📦 Block:</span>
                          <span className="text-cyan-300 font-semibold">{tx.blockHeight.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <button
                    onClick={() => onRecoverMiningTx(tx.txid)}
                    disabled={!tx.canContinueMinting || isLoadingRecovery}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      tx.canContinueMinting && !isLoadingRecovery
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:scale-105 hover:shadow-lg'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isLoadingRecovery ? '⏳ Loading...' : tx.canContinueMinting ? '🚀 Continue Minting' : '✓ Completed'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
      {/* No Results */}
      {!isScanning && !hasResults && !scanError && (
        <div className="bg-slate-800/30 border border-slate-600/50 rounded-lg p-4 text-center">
          <p className="text-slate-400 mb-2">No mining transactions found</p>
          <p className="text-slate-500 text-sm">
            Mining transactions must have OP_RETURN in vout[0] and outputs of 333 sats
          </p>
        </div>
      )}
    </div>
  );
}
