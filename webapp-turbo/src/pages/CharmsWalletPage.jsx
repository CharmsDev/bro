import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/index.js';

export function CharmsWalletPage() {
  const navigate = useNavigate();
  const { wallet, isWalletReady } = useStore();

  const handleBackToWalletManagement = () => {
    navigate('/wallet-management');
  };

  const handleOpenExternalWallet = () => {
    // This would open the actual Charms Wallet application
    // For now, we'll just show a placeholder
    window.open('https://charms.dev', '_blank');
  };

  if (!isWalletReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-8 backdrop-blur-md shadow-sm text-center max-w-md">
          <h2 className="text-2xl font-bold text-slate-200 mb-4">No Wallet Found</h2>
          <p className="text-slate-400 mb-6">
            You need to create or import a wallet first to access Charms Wallet.
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={handleBackToWalletManagement}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-4"
          >
            <span>←</span>
            <span>Back to Wallet Management</span>
          </button>
          <h1 className="text-4xl font-bold text-slate-200 mb-4 flex items-center justify-center gap-3">
            <span>✨</span>
            <span>Charms Wallet</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Advanced multi-chain wallet management powered by Charms protocol.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Current Wallet Info */}
          <div className="bg-slate-900/60 border border-purple-600/50 rounded-2xl p-8 backdrop-blur-md shadow-sm">
            <h2 className="text-2xl font-bold text-purple-400 mb-6 flex items-center gap-2">
              <span>�</span>
              <span>Connected Wallet</span>
            </h2>
            
            <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">Bitcoin Address</h3>
                  <code className="text-slate-200 font-mono text-sm break-all">
                    {wallet.address}
                  </code>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">Wallet Type</h3>
                  <span className="text-slate-200">
                    {wallet.isGenerated ? 'Generated Wallet' : 'Imported Wallet'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Multi-Chain Support */}
            <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6 backdrop-blur-md shadow-sm">
              <div className="text-center">
                <div className="text-4xl mb-4">�</div>
                <h3 className="text-lg font-semibold text-slate-200 mb-3">Multi-Chain</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Manage assets across Bitcoin, Ethereum, and other UTXO chains seamlessly.
                </p>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Coming Soon</div>
                </div>
              </div>
            </div>

            {/* Token Management */}
            <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6 backdrop-blur-md shadow-sm">
              <div className="text-center">
                <div className="text-4xl mb-4">🪙</div>
                <h3 className="text-lg font-semibold text-slate-200 mb-3">Token Portfolio</h3>
                <p className="text-slate-400 text-sm mb-4">
                  View and manage your BRO tokens and other digital assets in one place.
                </p>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Coming Soon</div>
                </div>
              </div>
            </div>

            {/* DeFi Integration */}
            <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6 backdrop-blur-md shadow-sm">
              <div className="text-center">
                <div className="text-4xl mb-4">�</div>
                <h3 className="text-lg font-semibold text-slate-200 mb-3">DeFi Access</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Access decentralized finance protocols directly from your wallet.
                </p>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Coming Soon</div>
                </div>
              </div>
            </div>

            {/* Cross-Chain Bridges */}
            <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6 backdrop-blur-md shadow-sm">
              <div className="text-center">
                <div className="text-4xl mb-4">�</div>
                <h3 className="text-lg font-semibold text-slate-200 mb-3">Bridge Assets</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Move your tokens between different blockchains without wrappers.
                </p>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Coming Soon</div>
                </div>
              </div>
            </div>

            {/* NFT Gallery */}
            <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6 backdrop-blur-md shadow-sm">
              <div className="text-center">
                <div className="text-4xl mb-4">�</div>
                <h3 className="text-lg font-semibold text-slate-200 mb-3">NFT Gallery</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Showcase and manage your NFT collection across multiple chains.
                </p>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Coming Soon</div>
                </div>
              </div>
            </div>

            {/* Security Center */}
            <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6 backdrop-blur-md shadow-sm">
              <div className="text-center">
                <div className="text-4xl mb-4">�</div>
                <h3 className="text-lg font-semibold text-slate-200 mb-3">Security</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Advanced security features including hardware wallet integration.
                </p>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">Coming Soon</div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-600/50 rounded-2xl p-8 backdrop-blur-md shadow-sm text-center">
            <h2 className="text-2xl font-bold text-slate-200 mb-4">Ready to Experience Charms Wallet?</h2>
            <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
              Charms Wallet is currently in development. Visit our website to learn more about the future of multi-chain wallet management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleOpenExternalWallet}
                className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-8 py-4 transition-all duration-200 shadow-sm text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:scale-105 hover:shadow-lg text-lg"
              >
                <span>�</span>
                <span>Visit Charms.dev</span>
              </button>
              <button
                onClick={handleBackToWalletManagement}
                className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-8 py-4 transition-all duration-200 shadow-sm border-2 border-slate-500 text-slate-200 hover:border-slate-400 hover:bg-slate-700/40 text-lg"
              >
                <span>←</span>
                <span>Back to Wallet</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
