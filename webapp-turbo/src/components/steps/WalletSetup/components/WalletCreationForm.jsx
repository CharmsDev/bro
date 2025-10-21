/**
 * WalletCreationForm - Form for creating or importing a wallet
 */
import React from 'react';

export function WalletCreationForm({ 
  isProcessing, 
  onCreateWallet, 
  onShowImportForm 
}) {
  return (
    <div className="w-full max-w-6xl mx-auto bg-slate-900/60 border border-slate-700 rounded-2xl p-8 backdrop-blur-md shadow-sm">
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
        <button 
          className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm text-white ${isProcessing ? 'bg-gray-600' : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:scale-105 hover:shadow-lg'}`}
          onClick={onCreateWallet}
          disabled={isProcessing}
        >
          <div className="flex items-center gap-2">
            <span>{isProcessing ? '' : '🔑'}</span>
            <span>{isProcessing ? 'Creating...' : 'Create New Wallet'}</span>
          </div>
        </button>
        
        <button 
          className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm border-2 border-slate-500 text-slate-200 hover:border-slate-400 hover:bg-slate-700/40 ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
          onClick={onShowImportForm}
          disabled={isProcessing}
        >
          <div className="flex items-center gap-2">
            <span>📥</span>
            <span>Import Existing Wallet</span>
          </div>
        </button>
      </div>
      
      {/* Info Box */}
      <div className="card">
        <h4 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
          <span>ℹ️</span>
          <span>Getting Started</span>
        </h4>
        <p className="text-slate-400 mb-4 leading-relaxed">
          Create a new Bitcoin wallet or import an existing one using your 12-word seed phrase.
        </p>
        <ul className="space-y-2 text-slate-300">
          <li className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Secure BIP39 seed phrase generation</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Taproot (P2TR) addresses</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Network-aware (testnet/mainnet)</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
