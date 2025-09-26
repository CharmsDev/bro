// Wallet visit domain - manages final step state and logic (Step 6)
export class WalletVisitDomain {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.data = {
            walletVisitEnabled: false
        };
    }

    // Wallet visit getters/setters
    get walletVisitEnabled() { 
        return this.data.walletVisitEnabled; 
    }
    
    set walletVisitEnabled(value) { 
        this.data.walletVisitEnabled = value;
    }

    // Enable wallet visit (final step)
    enableWalletVisit() {
        this.walletVisitEnabled = true;
        console.log('[WalletVisitDomain] Wallet visit enabled');
    }

    // Validation methods
    isWalletVisitEnabled() {
        return this.data.walletVisitEnabled;
    }

    // Internal method - ONLY called by reset system
    _resetState() {
        this.data = {
            walletVisitEnabled: false
        };
        console.log('[WalletVisitDomain] State reset by reset system');
    }

    // Get domain state
    getState() {
        return {
            walletVisitEnabled: this.data.walletVisitEnabled
        };
    }
}
