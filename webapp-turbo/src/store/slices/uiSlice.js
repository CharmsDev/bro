// UI slice for Zustand store
import { STEPS } from '../../constants/steps.js';

export const createUiSlice = (set, get) => ({
  // UI state
  currentStep: STEPS.WALLET_SETUP,
  isProcessing: false,
  error: null,
  
  // UI actions
  setCurrentStep: (step) => set({ currentStep: step }),
  
  setProcessing: (isProcessing) => set({ isProcessing }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),
  
  // Navigation helpers
  goToNextStep: () => {
    const { currentStep } = get();
    if (currentStep < STEPS.AUTO_MINTING) {
      set({ currentStep: currentStep + 1 });
    }
  },
  
  goToPreviousStep: () => {
    const { currentStep } = get();
    if (currentStep > STEPS.WALLET_SETUP) {
      set({ currentStep: currentStep - 1 });
    }
  },
  
  // Step validation
  canProceedToStep: (targetStep) => {
    const state = get();
    
    switch (targetStep) {
      case STEPS.BATCH_CONFIG:
        return state.isWalletReady();
      case STEPS.MINING:
        return state.isWalletReady();
      case STEPS.AUTO_MINTING:
        return state.isWalletReady();
      default:
        return true;
    }
  }
});
