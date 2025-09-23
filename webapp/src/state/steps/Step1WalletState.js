import { BaseStepState } from '../core/BaseStepState.js';
import { StorageUtils } from '../utils/storage-utils.js';

export class Step1WalletState extends BaseStepState {
    constructor() {
        super(1, 'WALLET_CREATION');
        this.data = {
            wallet: null,
            utxo: null
        };
        this.isMonitoring = false;
        this.monitoringStopFunction = null;
    }

    // Simple getters/setters
    get wallet() { return this.data.wallet; }
    set wallet(value) { 
        this.data.wallet = value;
        this.save();
        if (value) this.emit('walletCreated', value);
    }

    get utxo() { return this.data.utxo; }
    set utxo(value) { 
        this.data.utxo = value;
        this.save();
        if (value) this.emit('utxoFound', value);
    }

    // Simple actions
    startMonitoring(stopFunction) {
        this.isMonitoring = true;
        this.monitoringStopFunction = stopFunction;
        this.emit('monitoringStarted');
    }

    stopMonitoring() {
        if (this.monitoringStopFunction && typeof this.monitoringStopFunction === 'function') {
            try {
                this.monitoringStopFunction();
            } catch (error) {
                console.warn('Error stopping monitoring:', error);
            }
        }
        this.monitoringStopFunction = null;
        this.isMonitoring = false;
        this.emit('monitoringStopped');
    }

    completeWalletCreation(walletData) {
        this.wallet = walletData;
        this.complete();
    }

    completeFunding(utxoData) {
        this.utxo = utxoData;
        this.stopMonitoring();
        
        if (!this.isCompleted) {
            this.complete();
        }
        
        this.emit('readyForMining', { wallet: this.wallet, utxo: utxoData });
    }

    // Simple checks
    canAdvanceToNext() {
        return !!(this.wallet && this.utxo);
    }

    // Simple storage
    save() {
        StorageUtils.save('bro_step1', {
            ...this.data,
            isCompleted: this.isCompleted,
            isActive: this.isActive,
            timestamp: Date.now()
        });
    }

    load() {
        const saved = StorageUtils.load('bro_step1', {});
        this.data = {
            wallet: saved.wallet || null,
            utxo: saved.utxo || null
        };
        this.isCompleted = saved.isCompleted || false;
        this.isActive = saved.isActive || false;
        
        // Reset monitoring state on load - don't restore monitoring functions
        this.isMonitoring = false;
        this.monitoringStopFunction = null;
        
        // Auto-complete if we have both
        if (this.canAdvanceToNext()) {
            this.isCompleted = true;
        }
        
        return !!(this.wallet || this.utxo);
    }

    reset() {
        this.stopMonitoring();
        this.data = { wallet: null, utxo: null };
        this.isCompleted = false;
        this.isActive = false;
        StorageUtils.remove('bro_step1');
    }

    // Legacy compatibility methods
    setWallet(value) { this.wallet = value; }
    getWallet() { return this.wallet; }
    hasWallet() { return !!this.wallet; }
    setUtxo(value) { this.utxo = value; }
    getUtxo() { return this.utxo; }
    hasUtxo() { return !!this.utxo; }
    loadFromStorage() { return this.load(); }
    saveToStorage() { this.save(); }
}
