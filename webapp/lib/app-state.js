// Application State Management
class AppState {
    constructor() {
        this.wallet = null;
        this.miningResult = null;
        this.utxo = null;
        this.currentStep = 1;
        this.isMonitoring = false;
        this.monitoringStopFunction = null;

        // Event listeners for state changes
        this.listeners = {
            walletCreated: [],
            miningCompleted: [],
            utxoFound: [],
            stepChanged: []
        };
    }

    // Event system
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    // State transitions
    completeWalletCreation(wallet) {
        this.wallet = wallet;
        this.currentStep = 2;
        this.emit('walletCreated', wallet);
        this.emit('stepChanged', { step: 2, enabled: true });
        console.log('✅ Wallet created, mining enabled');
    }

    // Load mining result from localStorage and complete mining state
    loadMiningResult() {
        if (window.BitcoinMiner) {
            const miner = new window.BitcoinMiner();
            const result = miner.loadMiningResult();
            if (result) {
                this.miningResult = result;
                this.currentStep = 3;
                this.emit('miningCompleted', result);
                this.emit('stepChanged', { step: 3, enabled: true });
                console.log('✅ Mining result loaded from localStorage');
                return result;
            }
        }
        return null;
    }

    completeMining(result) {
        this.miningResult = result;
        this.currentStep = 3;
        this.emit('miningCompleted', result);
        this.emit('stepChanged', { step: 3, enabled: true });
        console.log('✅ Mining completed, starting automatic monitoring');
    }

    completeMonitoring(utxo) {
        this.utxo = utxo;
        this.isMonitoring = false;
        this.emit('utxoFound', utxo);
        console.log('✅ UTXO found, transaction creation enabled');
    }

    // State checks
    canStartMining() {
        return this.wallet !== null;
    }

    canCreateTransaction() {
        return this.miningResult !== null && this.utxo !== null;
    }

    canStartMonitoring() {
        return this.wallet !== null && this.miningResult !== null;
    }

    // Monitoring control
    startMonitoring(stopFunction) {
        this.isMonitoring = true;
        this.monitoringStopFunction = stopFunction;
    }

    stopMonitoring() {
        if (this.monitoringStopFunction) {
            this.monitoringStopFunction();
            this.monitoringStopFunction = null;
        }
        this.isMonitoring = false;
    }

    // Reset state (for development)
    reset() {
        this.wallet = null;
        this.miningResult = null;
        this.utxo = null;
        this.currentStep = 1;
        this.stopMonitoring();
        this.emit('stepChanged', { step: 1, enabled: true });
        console.log('🔄 App state reset');
    }

    // Get current state summary
    getState() {
        return {
            hasWallet: !!this.wallet,
            hasMiningResult: !!this.miningResult,
            hasUtxo: !!this.utxo,
            currentStep: this.currentStep,
            isMonitoring: this.isMonitoring,
            canStartMining: this.canStartMining(),
            canCreateTransaction: this.canCreateTransaction(),
            canStartMonitoring: this.canStartMonitoring()
        };
    }
}

// Export for use in other scripts
window.AppState = AppState;
