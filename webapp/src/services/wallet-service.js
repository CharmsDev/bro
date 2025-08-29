// Charms Wallet Service - Compatible with source wallet implementation

import { environmentConfig } from '../config/environment.js';

export class WalletService {
    constructor() {
        this.network = environmentConfig.getNetwork();
    }

    // Generate a proper BIP39-compliant 12-word seed phrase
    generateSeedPhrase() {
        const bip39 = window.bip39;
        if (!bip39) {
            throw new Error('BIP39 library not available');
        }

        // Generate a proper BIP39 mnemonic with 128 bits of entropy (12 words)
        return bip39.generateMnemonic(128);
    }

    // Generate Taproot address using network-aware derivation
    async generateAddress(seedPhrase, index = 0) {
        try {
            const bitcoin = window.bitcoin;
            const bip39 = window.bip39;
            const bip32 = window.bip32;

            if (!bitcoin || !bip39 || !bip32) {
                throw new Error('Required libraries not available');
            }

            // Validate the seed phrase using BIP39 (same as charms-wallet)
            if (!bip39.validateMnemonic(seedPhrase)) {
                throw new Error('Invalid seed phrase. Please check and try again.');
            }

            // Get the appropriate network based on environment
            const network = this.network.includes('testnet') ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;

            // Convert seed phrase to seed using BIP39
            const seed = await bip39.mnemonicToSeed(seedPhrase);

            // Derive the master node
            const masterNode = bip32.fromSeed(seed, network);

            // Use correct derivation path based on network
            // Testnet4 uses coin type 1', mainnet uses coin type 0'
            const coinType = this.network.includes('testnet') ? "1'" : "0'";
            const derivationPath = `m/86'/${coinType}/0'`;

            const accountNode = masterNode.derivePath(derivationPath);

            // Derive the chain node (0 for receiving addresses, 1 for change addresses)
            const chainNode = accountNode.derive(0); // Always use receiving chain for demo

            // Derive the address node at the specified index
            const addressNode = chainNode.derive(index);

            // Get the public key and convert to x-only format for Taproot
            const pubkey = addressNode.publicKey;
            // Convert to Buffer explicitly and remove the first byte (type prefix)
            const xOnlyPubkey = Buffer.from(pubkey.slice(1, 33));

            // Create a P2TR address using the same parameters as source wallet
            const { address } = bitcoin.payments.p2tr({
                internalPubkey: xOnlyPubkey,
                network,
                // Use the default taproot tree which is what Bitcoin Core uses
            });

            return address;

        } catch (error) {
            console.error('Error generating Taproot address:', error);
            throw error;
        }
    }

    // Generate change address (index 1) for the same seed phrase
    generateChangeAddress(seedPhrase) {
        return this.generateAddress(seedPhrase, 1);
    }

    // Generate Taproot keys (address + private key) for a specific index
    async generateTaprootKeysForIndex(seedPhrase, index) {
        try {
            const bitcoin = window.bitcoin;
            const bip39 = window.bip39;
            const bip32 = window.bip32;
            const ecc = window.ecc;

            if (!bitcoin || !bip39 || !bip32 || !ecc) {
                throw new Error('Required libraries not available');
            }

            // Convert mnemonic to seed buffer
            const seed = await bip39.mnemonicToSeed(seedPhrase);

            // Get the appropriate network based on environment
            const network = this.network.includes('testnet') ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
            
            // Generate BIP32 root key
            const root = bip32.fromSeed(seed, network);

            // Use correct derivation path based on network
            const coinType = this.network.includes('testnet') ? "1'" : "0'";
            const derivationPath = `m/86'/${coinType}/0'/0/${index}`;
            const child = root.derivePath(derivationPath);
            const privateKey = child.privateKey;

            if (!privateKey) {
                throw new Error(`Could not derive private key for path: ${derivationPath}`);
            }

            // Get the public key and convert to x-only format for Taproot
            const pubkey = child.publicKey;
            const xOnlyPubkey = Buffer.from(pubkey.slice(1, 33));

            // Apply Taproot tweaking
            const tweak = bitcoin.crypto.taggedHash('TapTweak', xOnlyPubkey);

            // Apply tweak to private key
            const isOddY = child.publicKey[0] === 0x03;
            const tweakedPrivateKey = ecc.privateAdd(
                isOddY ? ecc.privateNegate(privateKey) : privateKey,
                tweak
            );

            if (!tweakedPrivateKey) {
                throw new Error('Tweak resulted in invalid private key');
            }

            // Create P2TR payment object
            const p2tr = bitcoin.payments.p2tr({
                internalPubkey: xOnlyPubkey,
                network: network
            });

            return {
                index,
                address: p2tr.address,
                derivationPath,
                privateKey: privateKey.toString('hex'),
                tweakedPrivateKey: tweakedPrivateKey.toString('hex'),
                internalPubkey: xOnlyPubkey.toString('hex'),
                script: p2tr.output.toString('hex')
            };

        } catch (error) {
            console.error(`Error generating keys for index ${index}:`, error);
            throw error;
        }
    }


    // Get seed phrase from localStorage
    getSeedPhrase() {
        const stored = localStorage.getItem('charmsWallet');
        if (!stored) return undefined;
        try {
            const walletData = JSON.parse(stored);
            return walletData.seedPhrase;
        } catch (_) {
            return undefined;
        }
    }

    // Get network-aware derivation path for account level (used by Transaction Signer)
    getDerivationPath() {
        // Testnet4 uses coin type 1', mainnet uses coin type 0'
        const coinType = this.network.includes('testnet') ? "1'" : "0'";
        return `m/86'/${coinType}/0'`;
    }

    // Generate the first 3 addresses with their private keys
    async generateMultipleAddresses(seedPhrase, count = 3) {
        const addresses = [];

        for (let i = 0; i < count; i++) {
            const keyData = await this.generateTaprootKeysForIndex(seedPhrase, i);
            addresses.push(keyData);
        }

        return addresses;
    }


    // Store wallet data in localStorage with multiple addresses and private keys
    async storeWallet(seedPhrase, address = null) {
        try {
            // Generate the first 3 addresses with private keys
            const addresses = await this.generateMultipleAddresses(seedPhrase, 3);

            const walletData = {
                seedPhrase,
                address: address || addresses[0].address, // Keep backward compatibility
                addresses: addresses, // New: array of addresses with keys
                created: new Date().toISOString()
            };

            localStorage.setItem('charmsWallet', JSON.stringify(walletData));


            return walletData;

        } catch (error) {
            console.error('❌ Error storing wallet data:', error);
            throw error;
        }
    }

    // Retrieve wallet data from localStorage
    getStoredWallet() {
        const stored = localStorage.getItem('charmsWallet');
        return stored ? JSON.parse(stored) : null;
    }

}

// Export for global compatibility
window.CharmsWallet = WalletService;
