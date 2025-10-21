// Main Zustand store
// NOTE: Persistence is now handled by CentralStorage, not Zustand persist middleware
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createWalletSlice } from './slices/walletSlice.js';
import { createUiSlice } from './slices/uiSlice.js';
import { createBatchSlice } from './slices/batchSlice.js';
import { createMiningSlice } from './slices/miningSlice.js';

export const useStore = create()(
  devtools(
    (set, get) => ({
      // Combine all slices
      ...createWalletSlice(set, get),
      ...createUiSlice(set, get),
      ...createBatchSlice(set, get),
      ...createMiningSlice(set, get),
        
        // Step guards - derived selectors for step transitions
        canEditTurbomining: () => {
          // Check if turbomining selection can be edited via Module
          const TurbominingModule = require('../modules/turbomining/TurbominingModule.js').default;
          return !TurbominingModule.isLocked();
        },
        
        canProceedToStep4: () => {
          // Check if can proceed from Step 3 to Step 4 via Module
          const TurbominingModule = require('../modules/turbomining/TurbominingModule.js').default;
          const data = TurbominingModule.load();
          return data && (data.status === 'ready_to_broadcast' || data.miningTxid);
        },
        
        // Global actions
        reset: () => {
          set({
            currentStep: 1,
            wallet: {
              address: null,
              seedPhrase: null,
              privateKey: null,
              publicKey: null,
              isGenerated: false,
              isImported: false
            },
            batch: {
              quantity: 1,
              requiredFunds: 900,
              availableFunds: 0,
              fundingStatus: 'insufficient',
              utxos: [],
              selectedUtxos: [],
              isMonitoring: false,
              lastUpdated: null
            },
            mining: {
              isActive: false,
              mode: 'cpu',
              currentNonce: 0,
              currentHash: '',
              currentLeadingZeros: 0,
              bestHash: '',
              bestNonce: 0,
              bestLeadingZeros: 0,
              challenge: '',
              challengeTxid: '',
              challengeVout: 0,
              hashRate: 0,
              elapsed: 0,
              startTime: null,
              rewardInfo: null,
              result: null,
              hasResult: false,
              status: 'idle',
              statusMessage: '',
              error: null
            },
            isProcessing: false,
            error: null
          });
        }
      }),
    { name: 'BRO Minting Store' }
  )
);

// Expose store globally for services that need access outside React components
if (typeof window !== 'undefined') {
  window.__BRO_STORE__ = useStore;
}
