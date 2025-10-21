import { useState, useCallback } from 'react';
import { WalletUtxoScanner } from '../services/utxo/WalletUtxoScanner.js';

export function useWalletUtxoScanner() {
  const [walletUtxos, setWalletUtxos] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  const scanUtxos = useCallback(async () => {
    if (isScanning) return;
    
    setIsScanning(true);
    setError(null);
    setWalletUtxos(null);
    
    try {
      const scanner = new WalletUtxoScanner();
      const results = await scanner.scanAllWalletUtxos();
      
      const allUtxos = [...results.recipient, ...results.change];
      
      const transformedResults = {
        available: allUtxos,
        totalValue: results.totalValue,
        excluded: results.excludedCount ? [] : undefined
      };
      
      setWalletUtxos(transformedResults);
      return transformedResults;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, [isScanning]);

  return {
    walletUtxos,
    isScanning,
    error,
    scanUtxos
  };
}
