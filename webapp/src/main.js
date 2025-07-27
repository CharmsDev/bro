// Main application entry point
import './polyfills.js';
import { initializeLibraries } from './core/libraries.js';
import { AppState } from './store/app-state.js';
import { WalletService } from './services/wallet-service.js';
import { BitcoinAPIService } from './services/bitcoin-api-service.js';

// Initialize libraries first
initializeLibraries();

// Import all modules for global compatibility
import './store/app-state.js';
import './services/wallet-service.js';
import './services/bitcoin-api-service.js';
import './services/transaction-builder-service.js';
import './services/transaction-signer-service.js';
import './components/miner-component.js';
import { AppController } from './controllers/app-controller.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', async function () {
    console.log('✅ bitcoinjs-lib loaded successfully:', !!window.bitcoin);

    const appController = new AppController();

    try {
        await appController.initialize();
        console.log('✅ Application successfully initialized with modern ES6 modules');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        alert('Failed to initialize application. Please refresh the page and try again.');
    }

    // Make app controller available globally for debugging
    window.appController = appController;
});
