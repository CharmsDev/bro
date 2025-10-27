/**
 * NewMiningMode - Component for new mining transaction flow
 * Shows funding instructions and monitors for incoming UTXOs
 */
import React from 'react';

export function NewMiningMode({ 
  wallet,
  isMonitoring,
  message,
  pollingCount,
  onCopyAddress
}) {
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

      {/* Funding Instructions */}
      <div className="text-slate-300">
        <p>
          <strong>BTC is the gas you'll need to mine and mint $BRO.</strong><br/>
          Send funds to the address above to start mining $BRO.
        </p>
        <p className="mt-2">
          <strong>Minimum required: 7,000 satoshis (0.00007000 BTC)</strong>
        </p>
      </div>

      {/* Monitoring Status */}
      {isMonitoring && (
        <div className="bg-blue-900/20 border border-blue-600/50 rounded-xl p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-200/30 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
          
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <span className="text-blue-300 font-semibold text-lg">Monitoring blockchain...</span>
            </div>
            <p className="text-blue-400 text-sm">
              Scanning for incoming transactions with at least 7,000 satoshis
            </p>
          </div>
          
          <div className="bg-blue-800/30 rounded-lg p-3 text-center">
            <div className="text-blue-400 text-sm space-y-1">
              <div className="font-medium">Status: {message}</div>
              {pollingCount > 0 && (
                <div>Blockchain checks: {pollingCount}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Monitoring Placeholder */}
      {!isMonitoring && (
        <div className="bg-slate-800/30 border border-slate-600/50 rounded-xl p-4 text-center">
          <p className="text-slate-400 mb-3">Monitoring will start automatically when wallet is ready</p>
          <div className="text-slate-500 text-sm">
            We'll detect incoming transactions in real-time
          </div>
        </div>
      )}

      {/* Technical Note */}
      <div className="bg-amber-900/20 border border-amber-500/50 rounded-lg p-4">
        <p className="text-amber-300 text-sm">
          <strong>IMPORTANT:</strong> Your address must receive at least one UTXO of 7,000 satoshis or more in a single transaction.<br/>
          Multiple smaller UTXOs will not work for the mining process.
        </p>
      </div>
    </div>
  );
}
