/**
 * Domain Coordinator - Manages inter-domain communication and workflows
 * Clean separation of domain coordination logic
 */
export class DomainCoordinator {
    constructor(appState) {
        this.appState = appState;
    }

    /**
     * Setup all domain coordination and event flows
     */
    setupDomainCoordination() {
        this.setupWalletToMiningFlow();
        this.setupMiningToTransactionFlow();
        this.setupTransactionToBroadcastFlow();
        this.setupBroadcastToMintingFlow();
        this.setupMintingToWalletVisitFlow();
    }

    /**
     * Wallet → Mining flow coordination
     */
    setupWalletToMiningFlow() {
        // When UTXO is found, complete Step 1 and advance to Step 2
        this.appState.on('utxoFound', (utxo) => {
            console.log('[DomainCoordinator] ✅ UTXO found - transitioning to Step 2');
            
            this.appState.stepCoordinator.completeStep(1);
            this.appState.stepCoordinator.setCurrentStep(2);
            
            this.appState.emit('stepChanged', {
                step: 2,
                enabled: true,
                data: utxo
            });
        });
        
        // Legacy support for walletFunded event (if still used)
        this.appState.on('walletFunded', (data) => {
            this.appState.stepCoordinator.completeStep(1);
            this.appState.stepCoordinator.setCurrentStep(2);
            
            this.appState.emit('stepChanged', {
                step: 2,
                enabled: true,
                data: data
            });
        });
    }

    /**
     * Mining → Transaction flow coordination - SIMPLE
     */
    setupMiningToTransactionFlow() {
        // When mining STARTS → Disable Step 3
        this.appState.on('miningStarted', (data) => {
            console.log('[DomainCoordinator] Mining started - disabling Step 3');
            this.appState.transactionDomain.disable();
            this.appState.emit('stepChanged', {
                step: 3,
                enabled: false,
                data: data
            });
        });

        // When mining STOPS → Enable Step 3 (if valid results)
        this.appState.on('miningStopped', (data) => {
            if (data.hasValidResults) {
                console.log('[DomainCoordinator] Mining stopped with valid results - enabling Step 3');
                this.appState.stepCoordinator.completeStep(2);
                this.appState.stepCoordinator.setCurrentStep(3);
                this.appState.transactionDomain.enable();
                this.appState.emit('stepChanged', {
                    step: 3,
                    enabled: true,
                    data: data
                });
            } else {
                console.log('[DomainCoordinator] Mining stopped without valid results - Step 3 remains disabled');
            }
        });
    }

    /**
     * Transaction → Broadcast flow coordination
     */
    setupTransactionToBroadcastFlow() {
        // Handle transaction creation and step progression
        this.appState.on('transactionCreated', (transaction) => {
            this.appState.stepCoordinator.completeStep(3);
            this.appState.stepCoordinator.setCurrentStep(4);
            // BroadcastManager enables itself via stepChanged event
            
            // Mining is disabled by MiningManager via stepChanged event
            
            this.appState.emit('stepChanged', {
                step: 4,
                enabled: true,
                data: transaction
            });
        });
    }

    /**
     * Broadcast → Minting flow coordination
     */
    setupBroadcastToMintingFlow() {
        // When broadcast completes, enable minting
        this.appState.on('broadcastCompleted', (result) => {
            this.appState.stepCoordinator.completeStep(4);
            this.appState.stepCoordinator.setCurrentStep(5);
            
            this.appState.emit('stepChanged', {
                step: 5,
                enabled: true,
                data: result
            });
        });
    }

    /**
     * Minting → Wallet Visit flow coordination
     */
    setupMintingToWalletVisitFlow() {
        // When minting completes, enable wallet visit
        this.appState.on('mintingCompleted', (result) => {
            this.appState.stepCoordinator.completeStep(5);
            this.appState.stepCoordinator.setCurrentStep(6);
            this.appState.walletVisitDomain.enable();
            
            this.appState.emit('stepChanged', {
                step: 6,
                enabled: true,
                data: result
            });
        });
    }
}
