// WalletSetup - Wallet creation and import
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store/index.js';
import { useWallet } from '../../../hooks/useWallet.js';
import { useUtxoMonitor } from '../../../hooks/useUtxoMonitor.js';
import CentralStorage from '../../../storage/CentralStorage.js';
import { WalletCreationForm } from './components/WalletCreationForm.jsx';
import { WalletImportForm } from './components/WalletImportForm.jsx';
import { WalletDisplay } from './components/WalletDisplay.jsx';
import { UtxoMonitoring } from './components/UtxoMonitoring.jsx';

export function WalletSetup() {
  const navigate = useNavigate();
  const { wallet, isWalletReady, createWallet, importWallet, resetWallet, copyToClipboard } = useWallet();
  const isProcessing = useStore((state) => state.isProcessing);
  const error = useStore((state) => state.error);
  const goToNextStep = useStore((state) => state.goToNextStep);
  const batch = useStore((state) => state.batch);
  const loadBatchData = useStore((state) => state.loadBatchData);
  const { monitoringStatus, startMonitoring, stopMonitoring, setOnUtxoFoundCallback } = useUtxoMonitor();
  const [showImportForm, setShowImportForm] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [activeMode, setActiveMode] = useState('new'); // 'new' | 'recover'
  
  // Handle mode change - set recovery flag
  const handleModeChange = (mode) => {
    setActiveMode(mode);
    if (mode === 'recover') {
      CentralStorage.setMiningRecoveryMode(true);
    } else {
      CentralStorage.setMiningRecoveryMode(false);
    }
  };
  
  // Extract values from monitoringStatus
  const isMonitoring = monitoringStatus.isMonitoring;
  const foundUtxo = monitoringStatus.foundUtxo;

  // Hydrate wallet and batch data on mount
  useEffect(() => {
    // Load batch data (includes UTXOs)
    if (loadBatchData) {
      loadBatchData();
    }
    setIsHydrating(false);
  }, [loadBatchData]);

  const handleCreateWallet = async () => {
    await createWallet();
  };

  const handleImportWallet = async (seedPhrase) => {
    await importWallet(seedPhrase);
    setShowImportForm(false);
  };

  const handleCopySeedPhrase = async () => {
    if (wallet?.seedPhrase) {
      const success = await copyToClipboard(wallet.seedPhrase);
      if (success) {
      }
    }
  };

  const handleOpenCharmsWallet = () => {
    if (wallet?.seedPhrase) {
      // Encode seed phrase to base64 for URL
      const encodedSeed = btoa(wallet.seedPhrase);
      const url = `https://wallet.charms.dev/?seed=${encodedSeed}`;
      window.open(url, '_blank');
    }
  };

  const handleProceedToNext = () => {
    if (isWalletReady) {
      goToNextStep();
    }
  };

  const handleCopyAddress = () => {
    copyToClipboard(wallet.address, 'Bitcoin address copied to clipboard!');
  };

  // Show loading while hydrating
  if (isHydrating) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-8 backdrop-blur-md shadow-sm">
          <div className="text-center text-slate-400">
            Loading wallet...
          </div>
        </div>
      </div>
    );
  }

  // After hydration, check if wallet exists
  if (!isWalletReady) {
    return !showImportForm ? (
      <WalletCreationForm 
        isProcessing={isProcessing}
        onCreateWallet={handleCreateWallet}
        onShowImportForm={() => setShowImportForm(true)}
      />
    ) : (
      <WalletImportForm 
        isProcessing={isProcessing}
        error={error}
        onImport={handleImportWallet}
        onCancel={() => setShowImportForm(false)}
      />
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Card 1: Wallet Created */}
      <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-8 backdrop-blur-md shadow-sm">
        <WalletDisplay 
          wallet={wallet}
          onCopySeedPhrase={handleCopySeedPhrase}
          onOpenCharmsWallet={handleOpenCharmsWallet}
          onResetWallet={resetWallet}
        />
      </div>

      {/* Mode Tabs - Between Card 1 and Card 2 */}
      <div className="flex justify-center">
        <div className="inline-flex gap-2 bg-slate-800/50 border border-slate-600 rounded-xl p-1">
          <button
            onClick={() => handleModeChange('new')}
            className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
              activeMode === 'new'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ New Mining TX
          </button>
          <button
            onClick={() => handleModeChange('recover')}
            className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
              activeMode === 'recover'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔄 Recover Mining TX
          </button>
        </div>
      </div>

      {/* Card 2: UTXO Detection or Recovery */}
      <UtxoMonitoring 
        wallet={wallet}
        monitoringStatus={monitoringStatus}
        savedUtxos={batch?.selectedUtxos || batch?.utxos || []}
        onCopyAddress={handleCopyAddress}
        activeMode={activeMode}
      />
    </div>
  );
}
