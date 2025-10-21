// Charms Wallet Service - Main wallet coordinator
import { WalletGenerator } from './WalletGenerator.js';
import { WalletStorage } from '../../storage/index.js';

export class WalletService {
    constructor() {
        this.generator = new WalletGenerator();
    }

    // Generate seed phrase
    generateSeedPhrase() {
        return this.generator.generateSeedPhrase();
    }

    // Generate address
    async generateAddress(seedPhrase, index = 0) {
        return await this.generator.generateAddress(seedPhrase, index);
    }
    // Generate change address
    generateChangeAddress(seedPhrase) {
        return this.generator.generateChangeAddress(seedPhrase);
    }

    // Legacy methods - delegate to generator
    async generateTaprootKeysForIndex(seedPhrase, index) {
        return await this.generator.generateTaprootKeysForIndex(seedPhrase, index);
    }

    async generateMultipleAddresses(seedPhrase, count = 3) {
        return await this.generator.generateMultipleAddresses(seedPhrase, count);
    }

    getDerivationPath() {
        return this.generator.getDerivationPath();
    }

    // rjj: Extended addresses - delegate to generator and storage
    async generateExtendedAddresses(seedPhrase) {
        return await this.generator.generateExtendedAddresses(seedPhrase);
    }

    // rjj: Create wallet with 24 addresses
    async createWallet(seedPhrase = null) {
        try {
            const finalSeedPhrase = seedPhrase || this.generateSeedPhrase();
            
            
            // Legacy 3 addresses for compatibility
            const addresses = await this.generateMultipleAddresses(finalSeedPhrase, 3);
            
            // rjj: 24 addresses for Turbomining
            const extendedAddresses = await this.generateExtendedAddresses(finalSeedPhrase);

            const walletData = {
                seedPhrase: finalSeedPhrase,
                address: addresses[0].address,
                addresses: addresses,
                extendedAddresses: extendedAddresses,
                privateKey: addresses[0].privateKey,
                publicKey: addresses[0].internalPubkey,
                isGenerated: !seedPhrase,
                isImported: !!seedPhrase,
                created: new Date().toISOString()
            };

            // Save to storage
            await WalletStorage.saveExtendedAddresses(extendedAddresses);

            return walletData;

        } catch (error) {
            throw error;
        }
    }

    // Storage methods - delegate to WalletStorage
    loadExtendedAddresses() {
        return WalletStorage.loadExtendedAddresses();
    }

    getAllAddresses() {
        return WalletStorage.getAllAddresses();
    }

    // Get seed phrase from store (needed for transaction signing)
    getSeedPhrase() {
        // Access store from global window object (set by store initialization)
        // This avoids circular dependencies and works in browser environment
        if (typeof window !== 'undefined' && window.__BRO_STORE__) {
            const state = window.__BRO_STORE__.getState();
            return state.wallet?.seedPhrase;
        }
        return undefined;
    }

    // Copy text to clipboard
    async copyToClipboard(text) {
        try {
            if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(text);
                return true;
            }
            throw new Error('Navigator clipboard not available');
        } catch (_) {
            // Fallback: use a hidden textarea + execCommand
            try {
                const ta = document.createElement('textarea');
                ta.value = String(text ?? '');
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                ta.style.pointerEvents = 'none';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                if (!ok) throw new Error('execCommand copy failed');
                return true;
            } catch (err) {
                throw err;
            }
        }
    }
}

// Export globally
window.CharmsWallet = WalletService;
