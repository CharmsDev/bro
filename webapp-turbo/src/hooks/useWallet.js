// useWallet hook - React hook for wallet management
import { useCallback } from 'react';
import { useStore } from '../store/index.js';
import { WalletService } from '../services/wallet/WalletService.js';
import WalletModule from '../modules/wallet/WalletModule.js';
import CentralStorage from '../storage/CentralStorage.js';

export function useWallet() {
  const { 
    wallet, 
    setWallet, 
    clearWallet, 
    isWalletReady,
    setProcessing,
    setError,
    clearError 
  } = useStore();

  // Helper to save wallet with flags
  const saveWallet = useCallback((walletData, isImported = false) => {
    const walletWithFlags = {
      ...walletData,
      isGenerated: !isImported,
      isImported
    };
    setWallet(walletWithFlags);
    WalletModule.save(walletWithFlags);
  }, [setWallet]);

  const createWallet = useCallback(async () => {
    setProcessing(true);
    clearError();
    
    try {
      const walletService = new WalletService();
      const newWallet = await walletService.createWallet();
      saveWallet(newWallet, false);
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessing(false);
    }
  }, [saveWallet, setProcessing, setError, clearError]);

  const importWallet = useCallback(async (seedPhrase) => {
    if (!seedPhrase?.trim()) {
      setError('Seed phrase is required');
      return;
    }

    setProcessing(true);
    clearError();
    
    try {
      const walletService = new WalletService();
      const importedWallet = await walletService.createWallet(seedPhrase.trim());
      saveWallet(importedWallet, true);
    } catch (error) {
      setError(error.message);
    } finally {
      setProcessing(false);
    }
  }, [saveWallet, setProcessing, setError, clearError]);

  const resetWallet = useCallback(() => {
    clearWallet();
    clearError();
    
    // Clear ALL localStorage data (wallet, mining, turbomining, funding, etc.)
    CentralStorage.clearAll();
    
    const store = useStore.getState();
    store.reset?.();
    store.resetBatch?.();
    store.resetMining?.();
    
  }, [clearWallet, clearError]);

  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      setError('Failed to copy');
      return false;
    }
  }, [setError]);

  return {
    // State
    wallet,
    isWalletReady: isWalletReady(),
    
    // Actions
    createWallet,
    importWallet,
    resetWallet,
    copyToClipboard
  };
}
