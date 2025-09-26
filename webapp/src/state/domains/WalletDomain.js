// Wallet domain - manages all wallet-related state and logic
export class WalletDomain {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.data = {
            wallet: null,
            utxo: null,
            isMonitoring: false,
            monitoringStopFunction: null
        };
    }

    // Wallet getters/setters
    get wallet() { 
        return this.data.wallet; 
    }
    
    set wallet(value) { 
        this.data.wallet = value;
        if (value) {
            this.eventBus.emit('walletCreated', value);
        }
    }

    // UTXO getters/setters  
    get utxo() { 
        return this.data.utxo; 
    }
    
    set utxo(value) { 
        this.data.utxo = value;
        if (value) {
            this.eventBus.emit('utxoFound', value);
        }
    }

    // Monitoring state
    get isMonitoring() { 
        return this.data.isMonitoring; 
    }

    // Start UTXO monitoring
    startMonitoring(stopFunction) {
        console.log('[WalletDomain] Starting UTXO monitoring');
        this.data.isMonitoring = true;
        this.data.monitoringStopFunction = stopFunction;
    }

    // Stop UTXO monitoring
    stopMonitoring() {
        console.log('[WalletDomain] Stopping UTXO monitoring');
        this.data.isMonitoring = false;
        
        if (this.data.monitoringStopFunction) {
            if (typeof this.data.monitoringStopFunction === 'function') {
                try {
                    console.log('[WalletDomain] Calling stop function...');
                    this.data.monitoringStopFunction();
                    console.log('[WalletDomain] Stop function executed successfully');
                } catch (error) {
                    console.error('[WalletDomain] Error stopping monitoring:', error);
                }
            } else {
                console.warn('[WalletDomain] monitoringStopFunction is not a function:', typeof this.data.monitoringStopFunction);
            }
            this.data.monitoringStopFunction = null;
        } else {
            console.log('[WalletDomain] No monitoring stop function to call');
        }
    }

    // Complete wallet creation
    completeWalletCreation(walletData) {
        this.wallet = walletData;
        console.log('[WalletDomain] Wallet creation completed');
    }

    // Complete funding (UTXO found)
    completeFunding(utxo) {
        this.utxo = utxo;
        
        // CRITICAL: Save UTXO to Storage so it persists
        this.saveUtxoToStorage(utxo);
        
        console.log('[WalletDomain] Funding completed with UTXO:', utxo.txid);
    }

    // Save UTXO to Storage
    async saveUtxoToStorage(utxo) {
        try {
            const { Storage } = await import('../storage/Storage.js');
            Storage.updateStep(1, {
                isCompleted: true,
                data: { 
                    wallet: this.data.wallet,
                    utxo: utxo 
                }
            });
            console.log('[WalletDomain] ✅ UTXO saved to Storage:', utxo.txid);
        } catch (error) {
            console.error('[WalletDomain] ❌ Error saving UTXO to Storage:', error);
        }
    }

    // Validation methods
    hasWallet() {
        return !!this.data.wallet;
    }

    hasUtxo() {
        return !!this.data.utxo;
    }

    canStartMining() {
        return this.hasWallet() && this.hasUtxo();
    }

    // Internal method - ONLY called by reset system
    _resetState() {
        this.stopMonitoring();
        this.data = {
            wallet: null,
            utxo: null,
            isMonitoring: false,
            monitoringStopFunction: null
        };
        console.log('[WalletDomain] State reset by reset system');
    }

    // Get domain state
    getState() {
        return {
            hasWallet: this.hasWallet(),
            hasUtxo: this.hasUtxo(),
            isMonitoring: this.data.isMonitoring,
            canStartMining: this.canStartMining(),
            wallet: this.data.wallet,
            utxo: this.data.utxo
        };
    }
}
