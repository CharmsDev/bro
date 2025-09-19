// Main application entry point
import './polyfills.js';
import { initializeLibraries } from '../core/libraries.js';
import { MiningManager } from '../managers/mining-manager.js';
import { ProverSelection } from './prover-selection.js';
import { WalletService } from '../services/wallet-service.js';
import { BitcoinAPIService } from '../services/bitcoin-api-service.js';
import { AppController } from '../controllers/app-controller.js';
import { calculateRewardInfo } from '../mining/reward-calculator.js';
import '../services/webgpu-miner.js';


// Initialize libraries first
initializeLibraries();

// Make calculateRewardInfo available globally for AppState
window.calculateRewardInfo = calculateRewardInfo;

// Import all modules for global compatibility
import '../store/app-state.js';
import '../services/wallet-service.js';
import '../services/bitcoin-api-service.js';
import '../services/transaction-builder-service.js';
import '../services/transaction-signer-service.js';
import '../components/miner-component.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', async function () {
    const appController = new AppController();

    try {
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
