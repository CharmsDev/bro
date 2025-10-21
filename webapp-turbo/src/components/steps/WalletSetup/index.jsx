// WalletSetup - Wallet creation and import
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store/index.js';
import { useWallet } from '../../../hooks/useWallet.js';
import { useUtxoMonitor } from '../../../hooks/useUtxoMonitor.js';
import { WalletCreationForm } from './components/WalletCreationForm.jsx';
import { WalletImportForm } from './components/WalletImportForm.jsx';
import { WalletDisplay } from './components/WalletDisplay.jsx';
import { UtxoMonitoring } from './components/UtxoMonitoring.jsx';

export function WalletSetup() {
  const navigate = useNavigate();
  const { wallet, isWalletReady, createWallet, importWallet, resetWallet, copyToClipboard } = useWallet();
  const { isProcessing, error, goToNextStep, batch, loadBatchData } = useStore();
  const { monitoringStatus, startMonitoring, stopMonitoring, setOnUtxoFoundCallback } = useUtxoMonitor();
  const [showImportForm, setShowImportForm] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  
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
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-8 backdrop-blur-md shadow-sm space-y-8">
        {/* Card 1: Wallet Created */}
        <WalletDisplay 
          wallet={wallet}
          onCopySeedPhrase={handleCopySeedPhrase}
          onOpenCharmsWallet={handleOpenCharmsWallet}
          onResetWallet={resetWallet}
        />

        {/* Card 2: UTXO Detection for Minting Process */}
        <UtxoMonitoring 
          wallet={wallet}
          monitoringStatus={monitoringStatus}
          savedUtxos={batch?.selectedUtxos || batch?.utxos || []}
          onCopyAddress={handleCopyAddress}
        />
      </div>
    </div>
  );
}
