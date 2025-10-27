/**
 * useMiningTxScanner - Hook to scan wallet for mining transactions
 */
import { useState, useEffect, useMemo } from 'react';
import { MiningTxAnalyzer } from '../services/wallet/MiningTxAnalyzer.js';

export function useMiningTxScanner(walletAddress, shouldScan = false) {
  const [miningTxs, setMiningTxs] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  
  // Create analyzer instance once
  const analyzer = useMemo(() => new MiningTxAnalyzer(), []);

  const scanWallet = async () => {
    if (!walletAddress) {
      setError('No wallet address provided');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const txs = await analyzer.scanWalletForMiningTxs(walletAddress);
      setMiningTxs(txs);
      setLastScan(Date.now());
    } catch (err) {
      setError(err.message || 'Failed to scan wallet');
      setMiningTxs([]);
    } finally {
      setIsScanning(false);
    }
  };

  // Auto-scan when shouldScan becomes true
  useEffect(() => {
    if (shouldScan && walletAddress && !isScanning) {
      scanWallet();
    }
  }, [shouldScan, walletAddress]);

  return {
    miningTxs,
    isScanning,
    error,
    lastScan,
    scanWallet,
    hasResults: miningTxs.length > 0
  };
}
