/**
 * State Persistence - Handles saving and loading state
 * Clean persistence logic separated from main AppState
 */
import { Storage } from '../../storage/Storage.js';

export class StatePersistence {
    constructor(appState) {
        this.appState = appState;
    }

    /**
     * Save current step to storage
     */
    saveCurrentStep() {
        Storage.updateGlobal({
            currentStep: this.appState.stepCoordinator.getCurrentStep(),
            completedSteps: this.appState.stepCoordinator.completedSteps
        });
    }

    /**
     * Save completed steps to storage
     */
    saveCompletedSteps() {
        Storage.updateGlobal({
            currentStep: this.appState.stepCoordinator.getCurrentStep(),
            completedSteps: this.appState.stepCoordinator.completedSteps
        });
    }

    /**
     * Load state from storage using hydrator
     */
    loadFromStorage() {
        console.log('[StatePersistence] Calling StateHydrator.hydrateFromStorage()...');
        this.appState.stateHydrator.hydrateFromStorage();
    }

    /**
     * Get complete application state
     */
    getState() {
        return {
            // Step coordinator state
            ...this.appState.stepCoordinator.getState(),
            
            // Domain states
            ...this.appState.walletDomain.getState(),
            ...this.appState.miningDomain.getState(),
            ...this.appState.transactionDomain.getState(),
            ...this.appState.broadcastDomain.getState(),
            ...this.appState.mintingDomain.getState(),
            ...this.appState.walletVisitDomain.getState(),
            
            // Configuration
            proverConfig: this.appState.proverConfigManager.getConfig()
        };
    }
}
