// Wallet slice for Zustand store
export const createWalletSlice = (set, get) => ({
  // Wallet state
  wallet: {
    address: null,
    seedPhrase: null,
    privateKey: null,
    publicKey: null,
    isGenerated: false,
    isImported: false
  },

  // Wallet actions
  setWallet: (walletData) => set((state) => ({
    wallet: { ...state.wallet, ...walletData }
  })),

  clearWallet: () => set((state) => ({
    wallet: {
      address: null,
      seedPhrase: null,
      privateKey: null,
      publicKey: null,
      isGenerated: false,
      isImported: false
    }
  })),

  // Wallet status getters
  isWalletReady: () => {
    const { wallet } = get();
    return !!(wallet.address && (wallet.isGenerated || wallet.isImported));
  }
});
