// Main application entry point with ES6 imports
// Import polyfills FIRST to ensure Buffer is available globally
import './polyfills.js';

// Now import bitcoinjs-lib and other dependencies using the same setup as working wallet
import * as bitcoin from 'bitcoinjs-lib';
import * as bip39 from 'bip39';
import * as ecc from '@bitcoinerlab/secp256k1';
import { BIP32Factory } from 'bip32';
import { ECPairFactory } from 'ecpair';
import CryptoJS from 'crypto-js';

// Initialize ECC and create factories (same as working wallet)
bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

// Make libraries available globally for compatibility
window.bitcoin = bitcoin;
window.bip39 = bip39;
window.ecc = ecc;
window.bip32 = bip32;
window.ECPair = ECPair;
window.CryptoJS = CryptoJS;

// Import all the modules
import './lib/app-state.js';
import './lib/wallet.js';
import './lib/bitcoin-api.js';
import './lib/transaction-builder.js';
import './lib/transaction-signer-scure.js';
import './js/miner.js';
import './utils/app-controller.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', async function () {
    console.log('✅ bitcoinjs-lib loaded successfully:', !!window.bitcoin);

    // Import and initialize the main app controller
    const { AppController } = await import('./utils/app-controller.js');
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
