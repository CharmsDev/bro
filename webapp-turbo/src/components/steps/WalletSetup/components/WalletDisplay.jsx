/**
 * WalletDisplay - Display wallet information and seed phrase
 */
import React, { useState } from 'react';

export function WalletDisplay({ 
  wallet, 
  onCopySeedPhrase, 
  onOpenCharmsWallet, 
  onResetWallet 
}) {
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);

  return (
    <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6 backdrop-blur-md shadow-sm transition-colors duration-200 hover:border-slate-500 hover:shadow">
      <h4 className="text-xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
        <span>✅</span>
        <span>Wallet Created</span>
      </h4>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button 
          className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm ${showSeedPhrase ? 'text-white bg-red-600 hover:bg-red-700' : 'border-2 border-slate-500 text-slate-200 hover:border-slate-400 hover:bg-slate-700/40'}`}
          onClick={() => setShowSeedPhrase(!showSeedPhrase)}
        >
          <span>{showSeedPhrase ? '🔒' : '👁️'}</span>
          <span>{showSeedPhrase ? 'Hide' : 'Show'} Seed Phrase</span>
        </button>
        
        <button 
          className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:scale-105 hover:shadow-lg"
          onClick={onOpenCharmsWallet}
          title="Open in Charms Wallet"
        >
          <span>🌐</span>
          <span>Open in Charms Wallet</span>
        </button>
        
        <button 
          className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-4 py-3 transition-all duration-200 shadow-sm text-white bg-red-600 hover:bg-red-700"
          onClick={onResetWallet}
        >
          <span>🗑️</span>
          <span>Reset Wallet</span>
        </button>
      </div>
      
      {showSeedPhrase && (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
            <code className="text-slate-200 font-mono text-sm break-all leading-relaxed">
              {wallet.seedPhrase}
            </code>
          </div>
          
          <button 
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:scale-105 hover:shadow-lg"
            onClick={onCopySeedPhrase}
          >
            <span>📋</span>
            <span>Copy Seed Phrase</span>
          </button>
          
          <div className="bg-amber-900/20 border border-amber-500/50 rounded-lg p-4">
            <p className="text-amber-300 text-sm flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <span>Keep your seed phrase safe and private. Never share it with anyone!</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
