// Main application entry point
import './polyfills.js';
import { initializeLibraries } from '../core/libraries.js';
import { AppState } from '../store/app-state.js';
import { WalletService } from '../services/wallet-service.js';
import { BitcoinAPIService } from '../services/bitcoin-api-service.js';
import { AppController } from '../controllers/app-controller.js';


// Initialize libraries first
initializeLibraries();

// Import all modules for global compatibility
import '../store/app-state.js';
import '../services/wallet-service.js';
import '../services/bitcoin-api-service.js';
import '../services/transaction-builder-service.js';
import '../services/transaction-signer-service.js';
import '../services/broadcast-service.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', async function () {
    console.log('✅ Application initialized');

    const appController = new AppController();

    try {
        await appController.initialize();
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
    }

    // Make app controller available globally for debugging
    window.appController = appController;
});
