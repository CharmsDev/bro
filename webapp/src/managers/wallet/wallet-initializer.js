/**
 * WalletInitializer - Handles wallet detection, upgrade, and initialization logic
 */
export class WalletInitializer {
    constructor(wallet, appState, dom) {
        this.wallet = wallet;
        this.appState = appState;
        this.dom = dom;
    }

    /**
     * Check for existing wallet and upgrade if necessary
     */
    async checkExistingWallet() {
        if (!this.wallet) return;

        try {
            const existingWallet = this.wallet.getStoredWallet();
            if (existingWallet) {
                await this.upgradeWallet(existingWallet);
            } else {
            }
        } catch (error) {
            console.error('Error checking existing wallet, clearing localStorage:', error);
            this.handleWalletError();
        }
    }

    /**
     * Upgrade wallet from old format to multi-address format
     */
    async upgradeWallet(existingWallet) {
        try {
            // Regenerate wallet with existing seed phrase to get 3 addresses
            await this.wallet.storeWallet(existingWallet.seedPhrase);
            const upgradedWallet = this.wallet.getStoredWallet();

            this.appState.walletDomain.completeWalletCreation(upgradedWallet);
        } catch (error) {
            console.error('❌ Error upgrading wallet:', error);
            // Fall back to existing wallet data
            this.appState.walletDomain.completeWalletCreation(existingWallet);
        }
    }

    /**
     * Handle wallet errors by clearing and resetting UI
     */
    handleWalletError() {
        if (this.wallet && typeof this.wallet.clearWallet === 'function') {
            this.wallet.clearWallet();
        }
        this.dom.show('walletControls');
        this.dom.hide('seedPhraseBox');
        this.dom.hide('addressMonitoringBox');
    }
}
