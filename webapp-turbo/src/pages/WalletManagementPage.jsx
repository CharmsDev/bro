import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/index.js';
import { useWallet } from '../hooks/useWallet.js';
import CentralStorage from '../storage/CentralStorage.js';

export function WalletManagementPage() {
  const navigate = useNavigate();
  const { wallet, isWalletReady } = useStore();
  const { resetWallet, copyToClipboard } = useWallet();
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleCopyAddress = async () => {
    if (wallet.address) {
      const success = await copyToClipboard(wallet.address);
      if (success) {
        // Could add a toast notification here
      }
    }
  };

  const handleCopySeedPhrase = async () => {
    if (wallet.seedPhrase) {
      const success = await copyToClipboard(wallet.seedPhrase);
      if (success) {
      }
    }
  };

  const handleResetWallet = () => {
    // Reset wallet and clear all minting data
    resetWallet(); // This already calls CentralStorage.clearAll()
    setShowResetConfirm(false);
    
    // Navigate back to welcome page
    navigate('/');
  };

  const handleGoToCharmsWallet = () => {
    navigate('/charms-wallet');
  };

  const handleBackToProcess = () => {
    // Determine where to go back based on current state
    const currentStep = CentralStorage.getCurrentStep();
    const routes = {
      1: '/wallet-setup',
      2: '/mining-process', 
      3: '/batch-configuration',
      4: '/auto-minting'
    };
    
    navigate(routes[currentStep] || '/');
  };

  if (!isWalletReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-8 backdrop-blur-md shadow-sm text-center max-w-md">
          <h2 className="text-2xl font-bold text-slate-200 mb-4">No Wallet Found</h2>
          <p className="text-slate-400 mb-6">
            You need to create or import a wallet first to access wallet management.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:scale-105 hover:shadow-lg"
          >
            <span>�</span>
            <span>Go to Welcome</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-y-auto main-scroll">
      <div className="container mx-auto px-6 py-8 pb-16">
        
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={handleBackToProcess}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-4"
          >
            <span>←</span>
            <span>Back to Minting Process</span>
          </button>
          <h1 className="text-4xl font-bold text-slate-200 mb-4">Wallet Management</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Manage your Bitcoin wallet, view details, and control your minting process.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Wallet Status Card */}
          <div className="bg-slate-900/60 border border-emerald-600/50 rounded-2xl p-8 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                <span></span>
                <span>Wallet Active</span>
              </h2>
              <div className="text-sm text-emerald-300 bg-emerald-900/20 px-3 py-1 rounded-full">
                {wallet.isGenerated ? 'Generated' : 'Imported'}
              </div>
            </div>
            
            {/* Bitcoin Address */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <span>�</span>
                <span>Bitcoin Address</span>
              </h3>
              <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-4 flex items-center gap-4">
                <code className="flex-1 text-slate-200 font-mono text-sm break-all">
                  {wallet.address}
                </code>
                <button 
                  className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-4 py-2 transition-all duration-200 shadow-sm text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:scale-105 hover:shadow-lg"
                  onClick={handleCopyAddress}
                  title="Copy address"
                >
                  <span>�</span>
                </button>
              </div>
            </div>

            {/* Seed Phrase Section */}
            {wallet.seedPhrase && (
              <div className="bg-slate-800/30 border border-slate-600 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <span>�</span>
                  <span>Seed Phrase</span>
                </h3>
                
                <div className="flex flex-wrap gap-3 mb-6">
                  <button 
                    className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm ${showSeedPhrase ? 'text-white bg-red-600 hover:bg-red-700' : 'border-2 border-slate-500 text-slate-200 hover:border-slate-400 hover:bg-slate-700/40'}`}
                    onClick={() => setShowSeedPhrase(!showSeedPhrase)}
                  >
                    <span>{showSeedPhrase ? '�' : '�'}</span>
                    <span>{showSeedPhrase ? 'Hide' : 'Show'} Seed Phrase</span>
                  </button>
                  
                  {showSeedPhrase && (
                    <button 
                      className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:scale-105 hover:shadow-lg"
                      onClick={handleCopySeedPhrase}
                    >
                      <span>�</span>
                      <span>Copy Seed Phrase</span>
                    </button>
                  )}
                </div>
                
                {showSeedPhrase && (
                  <div className="space-y-4">
                    <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
                      <code className="text-slate-200 font-mono text-sm break-all leading-relaxed">
                        {wallet.seedPhrase}
                      </code>
                    </div>
                    <div className="bg-amber-900/20 border border-amber-500/50 rounded-lg p-4">
                      <p className="text-amber-300 text-sm flex items-start gap-2">
                        <span className="mt-0.5"></span>
                        <span>Keep your seed phrase safe and private. Never share it with anyone! This is the only way to recover your wallet.</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions Card */}
          <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-8 backdrop-blur-md shadow-sm">
            <h2 className="text-2xl font-bold text-slate-200 mb-6 flex items-center gap-2">
              <span>⚙</span>
              <span>Wallet Actions</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Charms Wallet */}
              <div className="bg-slate-800/30 border border-slate-600 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <span>✨</span>
                  <span>Charms Wallet</span>
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Access advanced wallet features and manage your tokens across different chains.
                </p>
                <button
                  onClick={handleGoToCharmsWallet}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:scale-105 hover:shadow-lg"
                >
                  <span></span>
                  <span>Open Charms Wallet</span>
                </button>
              </div>

              {/* Reset Wallet */}
              <div className="bg-slate-800/30 border border-red-600/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <span></span>
                  <span>Reset Wallet</span>
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  This will delete your current wallet and all minting progress. Make sure you have your seed phrase saved!
                </p>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm text-white bg-red-600 hover:bg-red-700"
                >
                  <span></span>
                  <span>Reset Wallet</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-red-600/50 rounded-2xl p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
                <span></span>
                <span>Confirm Reset</span>
              </h3>
              <p className="text-slate-300 mb-6">
                Are you sure you want to reset your wallet? This action cannot be undone and will:
              </p>
              <ul className="text-slate-400 text-sm mb-6 space-y-2">
                <li>• Delete your current wallet</li>
                <li>• Clear all minting progress</li>
                <li>• Reset all application data</li>
                <li>• Return you to the welcome page</li>
              </ul>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm border-2 border-slate-500 text-slate-200 hover:border-slate-400 hover:bg-slate-700/40"
                >
                  <span></span>
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleResetWallet}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 transition-all duration-200 shadow-sm text-white bg-red-600 hover:bg-red-700"
                >
                  <span></span>
                  <span>Reset Now</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
