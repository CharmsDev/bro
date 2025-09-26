// CLEAN MODULAR AppState - Modern architecture
// Each responsibility is separated into focused modules

// Core systems
import { EventBus } from './EventBus.js';
import { StepCoordinator } from './StepCoordinator.js';

// Domain modules
import { WalletDomain } from '../domains/WalletDomain.js';
import { MiningDomain } from '../domains/MiningDomain.js';
import { TransactionDomain } from '../domains/TransactionDomain.js';
import { BroadcastDomain } from '../domains/BroadcastDomain.js';
import { MintingDomain } from '../domains/MintingDomain.js';
import { WalletVisitDomain } from '../domains/WalletVisitDomain.js';

// Specialized modules
import { ProverConfigManager } from './config/ProverConfigManager.js';
import { DomainCoordinator } from './coordination/DomainCoordinator.js';
import { StateValidator } from './validation/StateValidator.js';
import { StatePersistence } from './persistence/StatePersistence.js';

// Utilities
import { ResetManager } from '../reset/ResetManager.js';
import { StateHydrator } from '../hydration/StateHydrator.js';

export class AppState extends EventBus {
    constructor() {
        super();
        console.log('[AppState] Constructor called - creating AppState instance...');

        // Core systems
        this.stepCoordinator = new StepCoordinator(this);
        
        // Domain modules
        this.walletDomain = new WalletDomain(this);
        this.miningDomain = new MiningDomain(this);
        this.transactionDomain = new TransactionDomain(this);
        this.broadcastDomain = new BroadcastDomain(this);
        this.mintingDomain = new MintingDomain(this);
        this.walletVisitDomain = new WalletVisitDomain(this);
        
        // Specialized modules
        this.proverConfigManager = new ProverConfigManager();
        this.domainCoordinator = new DomainCoordinator(this);
        this.stateValidator = new StateValidator(this);
        this.statePersistence = new StatePersistence(this);
        
        // Utilities
        this.resetManager = new ResetManager(this);
        this.stateHydrator = new StateHydrator(this);

        // Initialization
        this.initialize();
    }

    // Initialize the application state
    initialize() {
        console.log('[AppState] Starting initialization...');
        
        // Load state from localStorage first
        console.log('[AppState] Loading from storage...');
        this.loadFromStorage();
        
        // Setup domain coordination
        console.log('[AppState] Setting up domain coordination...');
        this.domainCoordinator.setupDomainCoordination();
        
        console.log('[AppState] Initialization completed');
        
        // Cleanup stale data
        this.stateValidator.cleanupStaleData();
    }

    // Public API

    // Get current step
    getCurrentStep() {
        return this.stepCoordinator.getCurrentStep();
    }

    // Get completed steps
    getCompletedSteps() {
        return this.stepCoordinator.completedSteps;
    }

    // Check if step is completed
    isStepCompleted(step) {
        return this.stepCoordinator.isStepCompleted(step);
    }

    // Check if step is active
    isStepActive(step) {
        return this.stepCoordinator.isStepActive(step);
    }

    // Advance to next step
    advanceToNextStep() {
        return this.stepCoordinator.advanceToNextStep();
    }

    // Complete a specific step
    completeStep(stepNumber) {
        return this.stepCoordinator.completeStep(stepNumber);
    }

    // Set current step
    setCurrentStep(step) {
        return this.stepCoordinator.setCurrentStep(step);
    }

    // Domain access

    // Get wallet domain
    getWalletDomain() {
        return this.walletDomain;
    }

    // Get mining domain
    getMiningDomain() {
        return this.miningDomain;
    }

    // Get transaction domain
    getTransactionDomain() {
        return this.transactionDomain;
    }

    // Get broadcast domain
    getBroadcastDomain() {
        return this.broadcastDomain;
    }

    // Get minting domain
    getMintingDomain() {
        return this.mintingDomain;
    }

    // Get wallet visit domain
    getWalletVisitDomain() {
        return this.walletVisitDomain;
    }

    // Event system
    // EventBus methods are inherited from parent class

    // Configuration

    // Update prover configuration
    updateProverConfig(config) {
        this.proverConfigManager.updateConfig(config);
    }

    // Get prover configuration
    getProverConfig() {
        return this.proverConfigManager.getConfig();
    }

    // State management

    // Get complete application state
    getState() {
        return this.statePersistence.getState();
    }

    // Save current step
    saveCurrentStep() {
        this.statePersistence.saveCurrentStep();
    }

    // Load state from storage
    loadFromStorage() {
        this.statePersistence.loadFromStorage();
    }

    // Validate state consistency
    validateStateConsistency() {
        this.stateValidator.validateStateConsistency();
    }

    // Reset operations

    // Perform complete reset
    reset() {
        this.resetManager.completeReset();
    }

    // Perform partial reset (Mint More)
    partialReset() {
        this.resetManager.partialReset();
    }
}

// Export globally
window.AppState = AppState;
