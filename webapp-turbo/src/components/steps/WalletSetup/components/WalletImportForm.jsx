/**
 * WalletImportForm - Form for importing an existing wallet
 */
import React, { useState } from 'react';

export function WalletImportForm({ 
  isProcessing, 
  error,
  onImport, 
  onCancel 
}) {
  const [seedPhrase, setSeedPhrase] = useState('');

  const handleImport = () => {
    if (seedPhrase.trim()) {
      onImport(seedPhrase);
      setSeedPhrase('');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-slate-900/60 border border-slate-700 rounded-2xl p-8 backdrop-blur-md shadow-sm">
      <div className="max-w-xl mx-auto card card-hover">
        <h4 className="text-2xl font-bold text-slate-200 mb-4 text-center flex items-center justify-center gap-2">
          <span>📥</span>
          <span>Import Wallet</span>
        </h4>
        <p className="text-slate-400 mb-6 text-center">
          Enter your 12-word seed phrase to restore your wallet:
        </p>

        <div className="mb-6">
          <textarea
            value={seedPhrase}
            onChange={(e) => setSeedPhrase(e.target.value)}
            placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
            rows={4}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none font-mono text-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <button 
            className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm text-white ${(!seedPhrase.trim() || isProcessing) ? 'bg-gray-600 opacity-60 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:scale-105 hover:shadow-lg'}`}
            onClick={handleImport}
            disabled={!seedPhrase.trim() || isProcessing}
          >
            <span>{isProcessing ? '⏳' : '📥'}</span>
            <span>{isProcessing ? 'Importing...' : 'Import Wallet'}</span>
          </button>
          
          <button 
            className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm border-2 border-slate-500 text-slate-200 hover:border-slate-400 hover:bg-slate-700/40 ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={onCancel}
            disabled={isProcessing}
          >
            <span>❌</span>
            <span>Cancel</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 card border-red-500/60">
            <span className="text-red-400 font-semibold">{error}</span>
          </div>
        )}

        <div className="bg-amber-900/20 border border-amber-500/50 rounded-lg p-4 text-center">
          <p className="text-amber-300 text-sm flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>Make sure your seed phrase is correct. An incorrect phrase will create a different wallet.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
