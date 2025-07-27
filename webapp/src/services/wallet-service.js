// Charms Wallet Service - Compatible with source wallet implementation

export class WalletService {
    constructor() {
        this.network = 'testnet';
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

    // Generate Taproot address using exact same method as source wallet
    async generateTestnet4Address(seedPhrase, index = 0) {
        console.log('=== TAPROOT ADDRESS GENERATION DEBUG ===');
        console.log('Input seed phrase:', seedPhrase);
        console.log('Input index:', index);

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

            // Get the appropriate network (testnet)
            const network = bitcoin.networks.testnet;

            // Convert seed phrase to seed using BIP39
            const seed = await bip39.mnemonicToSeed(seedPhrase);
            console.log('Seed generated from mnemonic');

            // Derive the master node
            const masterNode = bip32.fromSeed(seed, network);
            console.log('Master node created');

            // Use the same derivation path as source wallet: m/86'/0'/0'
            // Note: Source wallet uses mainnet-style path even for testnet
            const derivationPath = "m/86'/0'/0'";
            console.log('Derivation path:', derivationPath);

            const accountNode = masterNode.derivePath(derivationPath);
            console.log('Account node derived');

            // Derive the chain node (0 for receiving addresses, 1 for change addresses)
            const chainNode = accountNode.derive(0); // Always use receiving chain for demo
            console.log('Chain node derived');

            // Derive the address node at the specified index
            const addressNode = chainNode.derive(index);
            console.log('Address node derived for index:', index);

            // Get the public key and convert to x-only format for Taproot
            const pubkey = addressNode.publicKey;
            // Convert to Buffer explicitly and remove the first byte (type prefix)
            const xOnlyPubkey = Buffer.from(pubkey.slice(1, 33));
            console.log('X-only pubkey:', xOnlyPubkey.toString('hex'));

            // Create a P2TR address using the same parameters as source wallet
            const { address } = bitcoin.payments.p2tr({
                internalPubkey: xOnlyPubkey,
                network,
                // Use the default taproot tree which is what Bitcoin Core uses
            });

            console.log('Generated Taproot address:', address);
            console.log('Address length:', address.length);
            console.log('Address validation:', {
                startsWithTb1p: address.startsWith('tb1p'),
                hasCorrectLength: address.length === 62
            });
            console.log('=== END TAPROOT ADDRESS GENERATION DEBUG ===');

            return address;

        } catch (error) {
            console.error('Error generating Taproot address:', error);
            throw error;
        }
    }

    // Generate change address (index 1) for the same seed phrase
    generateChangeAddress(seedPhrase) {
        return this.generateTestnet4Address(seedPhrase, 1);
    }

    // Copy text to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
    }

    // Store wallet data in localStorage
    storeWallet(seedPhrase, address) {
        const walletData = {
            seedPhrase,
            address,
            created: new Date().toISOString()
        };
        localStorage.setItem('charmsWallet', JSON.stringify(walletData));
    }

    // Retrieve wallet data from localStorage
    getStoredWallet() {
        const stored = localStorage.getItem('charmsWallet');
        return stored ? JSON.parse(stored) : null;
    }

    // Clear stored wallet
    clearWallet() {
        localStorage.removeItem('charmsWallet');
    }
}

// Export for global compatibility
window.CharmsWallet = WalletService;
