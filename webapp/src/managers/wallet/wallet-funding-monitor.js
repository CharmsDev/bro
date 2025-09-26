/**
 * WalletFundingMonitor - Handles UTXO monitoring and funding detection
 */
export class WalletFundingMonitor {
    constructor(appState, txBuilder, uiController) {
        this.appState = appState;
        this.txBuilder = txBuilder;
        this.uiController = uiController;
    }

    /**
     * Start monitoring for funding on the current wallet address
     * SOLO funciona en Step 1 - se para automáticamente cuando encuentra UTXO
     */
    async startFundingMonitoring() {
        // Verificaciones básicas
        if (!this.appState.walletDomain.hasWallet() || !this.txBuilder) {
            console.error('Cannot start funding monitoring: missing wallet or txBuilder');
            console.error('- hasWallet():', this.appState.walletDomain.hasWallet());
            console.error('- txBuilder:', this.txBuilder);
            return;
        }
        
        console.log('[WalletFundingMonitor] ✅ Starting UTXO monitoring for address:', this.appState.walletDomain.wallet.address);

        // Si ya tenemos UTXO, no monitoreamos - mostramos el UTXO existente
        if (this.appState.walletDomain.hasUtxo()) {
            this.uiController.showUtxoFound(this.appState.walletDomain.utxo);
            return;
        }

        // Si ya estamos en Step 2 o superior, no monitoreamos
        if (this.appState.stepCoordinator.getCurrentStep() > 1) {
            return;
        }

        const currentWallet = this.appState.walletDomain.wallet;
        
        // Ensure we're using the primary address (index 0) for monitoring
        const monitoringAddress = currentWallet.addresses ? currentWallet.addresses[0].address : currentWallet.address;

        // Show monitoring UI
        this.uiController.showFundingMonitoring();

        const stopFunction = this.txBuilder.monitorAddress(
            monitoringAddress,
            (utxo) => this.handleUtxoFound(utxo),
            (status) => this.handleStatusUpdate(status),
            (error) => this.handleMonitoringError(error)
        );

        // Validar que stopFunction es realmente una función
        if (typeof stopFunction === 'function') {
            console.log('[FundingMonitor] Valid stop function received, storing in wallet domain');
            this.appState.walletDomain.startMonitoring(stopFunction);
        } else {
            console.warn('[FundingMonitor] Invalid stop function received:', typeof stopFunction);
            // Crear una función dummy para evitar errores
            this.appState.walletDomain.startMonitoring(() => {
                console.log('[FundingMonitor] Dummy stop function called');
            });
        }
    }

    /**
     * Handle UTXO found callback - SIMPLE: guarda UTXO y avanza a Step 2
     */
    handleUtxoFound(utxo) {
        console.log('✅ [FundingMonitor] UTXO found - advancing to Step 2:', utxo);
        
        // 1. Stop monitoring (ya no necesitamos monitorear)
        this.appState.walletDomain.stopMonitoring();
        
        // 2. Guardar UTXO en el dominio (automáticamente se persiste)
        this.appState.walletDomain.completeFunding(utxo);
        
        // 3. Mostrar UTXO en UI
        this.uiController.showUtxoFound(utxo);
        
        // 4. Emitir evento - el DomainCoordinator manejará la transición de steps
        this.appState.emit('utxoFound', utxo);
    }

    /**
     * Handle status update callback
     */
    handleStatusUpdate(status) {
        this.uiController.updateFundingStatus(status.message);
    }

    /**
     * Handle monitoring error callback
     */
    handleMonitoringError(error) {
        console.error('Funding monitoring error:', error);
        this.uiController.showFundingError(error);
    }
}
