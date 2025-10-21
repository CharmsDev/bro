import { useEffect, useRef, useCallback } from 'react';
import BitcoinApiRouter from '../../../../services/providers/bitcoin-api-router/bitcoin-api-router.js';

export function AddressMonitor({ address, onFundsDetected }) {
  const intervalRef = useRef(null);
  const previousTotalRef = useRef(0);
  const isInitializedRef = useRef(false);
  const apiRouterRef = useRef(null);
  const onFundsDetectedRef = useRef(onFundsDetected);
  useEffect(() => {
    onFundsDetectedRef.current = onFundsDetected;
  }, [onFundsDetected]);

  const checkAddress = useCallback(async () => {
    if (!apiRouterRef.current) {
      apiRouterRef.current = new BitcoinApiRouter();
    }

    try {
      const utxos = await apiRouterRef.current.getAddressUtxos(address);
      const currentTotal = utxos?.reduce((sum, utxo) => sum + Number(utxo.value), 0) || 0;

      if (isInitializedRef.current && currentTotal > previousTotalRef.current) {
        const newFunds = currentTotal - previousTotalRef.current;
        
        if (onFundsDetectedRef.current) {
          onFundsDetectedRef.current(utxos, newFunds);
        }
      }

      previousTotalRef.current = currentTotal;
      isInitializedRef.current = true;

    } catch (error) {
    }
  }, [address]);

  useEffect(() => {
    checkAddress();
    intervalRef.current = setInterval(checkAddress, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isInitializedRef.current = false;
      previousTotalRef.current = 0;
    };
  }, [address, checkAddress]); // checkAddress is stable via useCallback

  // No visual output - pure background process
  return null;
}
