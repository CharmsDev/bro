// Main application entry point
console.log('[MAIN] Starting application initialization...');
import './polyfills.js';
import { initializeLibraries } from './libraries.js';
import { ProverSelection } from './prover-selection.js';
import { AppController } from '../controllers/app-controller.js';
import { calculateRewardInfo } from '../../mining/reward-calculator.js';

// Import all modules globally
import '../../state/core/AppState.js';
import '../../services/wallet-service.js';
import '../../services/bitcoin-api-service.js';
import '../../services/transaction-builder-service.js';
// import '../../services/transaction-signer-service.js';
import '../../mining/mining-orchestrator.js';
import '../../mining/webgpu-miner.js';

// Initialize libraries first
initializeLibraries();

// Make calculateRewardInfo available globally for AppState
window.calculateRewardInfo = calculateRewardInfo;

// Initialize the application
document.addEventListener('DOMContentLoaded', async function () {
    console.log('[MAIN] DOM loaded, initializing AppController...');
    const appController = new AppController();

    try {
        console.log('[MAIN] Calling appController.initialize()...');
        await appController.initialize();
        
        // Initialize prover selection with AppState
        const proverSelection = new ProverSelection(appController.modules.domElements, appController.appState);
        window.proverSelection = proverSelection;
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
    }

    // Make app controller available globally for debugging
    window.appController = appController;
});
