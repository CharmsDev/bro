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

    // Generate Taproot keys (address + private key) for a specific index
    async generateTaprootKeysForIndex(seedPhrase, index) {
        console.log(`🔑 Generating keys for index ${index}...`);
        
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

            // Generate BIP32 root key
            const root = bip32.fromSeed(seed, bitcoin.networks.testnet);

            // Use the same derivation path: m/86'/0'/0'/0/{index}
            const derivationPath = `m/86'/0'/0'/0/${index}`;
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
                network: bitcoin.networks.testnet
            });

            console.log(`   Index ${index}: ${p2tr.address}`);

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

    // Get tweaked private key for a specific address index
    async getTweakedKeysForIndex(index) {
        try {
            const seedPhrase = this.getSeedPhrase();
            if (!seedPhrase) {
                throw new Error('Seed phrase not found in wallet storage');
            }

            const bitcoin = window.bitcoin;
            const bip39 = window.bip39;
            const bip32 = window.bip32;
            const ecc = window.ecc;

            if (!bitcoin || !bip39 || !bip32 || !ecc) {
                throw new Error('Required libraries not available');
            }

            const seed = await bip39.mnemonicToSeed(seedPhrase);
            const root = bip32.fromSeed(seed, bitcoin.networks.testnet);
            const derivationPath = `m/86'/0'/0'/0/${index}`;
            const child = root.derivePath(derivationPath);
            const privateKey = child.privateKey;
            
            if (!privateKey) {
                throw new Error(`Could not derive private key for path: ${derivationPath}`);
            }

            const xOnlyPubkey = Buffer.from(child.publicKey.slice(1, 33));
            const tweak = bitcoin.crypto.taggedHash('TapTweak', xOnlyPubkey);
            const isOddY = child.publicKey[0] === 0x03;
            const tweakedPrivateKey = ecc.privateAdd(
                isOddY ? ecc.privateNegate(privateKey) : privateKey,
                tweak
            );
            
            if (!tweakedPrivateKey) {
                throw new Error('Tweak resulted in invalid private key');
            }

            const p2tr = bitcoin.payments.p2tr({
                internalPubkey: xOnlyPubkey,
                network: bitcoin.networks.testnet
            });

            return {
                tweakedPrivateKey,
                internalPubkey: xOnlyPubkey,
                p2tr,
                address: p2tr.address
            };

        } catch (error) {
            console.error(`Error getting tweaked keys for index ${index}:`, error);
            throw error;
        }
    }

    // Get seed phrase from localStorage
    getSeedPhrase() {
        const walletData = JSON.parse(localStorage.getItem('wallet_data') || '{}');
        return walletData.seedPhrase;
    }

    // Generate the first 3 addresses with their private keys
    async generateMultipleAddresses(seedPhrase, count = 3) {
        console.log(`🏗️ Generating ${count} addresses with private keys...`);
        
        const addresses = [];
        
        for (let i = 0; i < count; i++) {
            const keyData = await this.generateTaprootKeysForIndex(seedPhrase, i);
            addresses.push(keyData);
        }

        console.log(`✅ Generated ${count} addresses successfully`);
        return addresses;
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

    // Store wallet data in localStorage with multiple addresses and private keys
    async storeWallet(seedPhrase, address = null) {
        console.log('💾 Storing wallet data with multiple addresses...');
        
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
            
            // Print wallet data to console for verification
            console.log('📋 WALLET DATA STORED IN LOCALSTORAGE:');
            console.log('=====================================');
            console.log('Seed Phrase:', seedPhrase);
            console.log('Primary Address (Index 0):', addresses[0].address);
            console.log('');
            
            addresses.forEach((addr, i) => {
                console.log(`🏠 ADDRESS ${i}:`);
                console.log(`   Address: ${addr.address}`);
                console.log(`   Derivation Path: ${addr.derivationPath}`);
                console.log(`   Private Key: ${addr.privateKey}`);
                console.log(`   Tweaked Private Key: ${addr.tweakedPrivateKey}`);
                console.log(`   Internal Pubkey: ${addr.internalPubkey}`);
                console.log(`   Script: ${addr.script}`);
                console.log('');
            });
            
            console.log('✅ Wallet data stored successfully with 3 addresses');
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

    // Clear stored wallet
    clearWallet() {
        localStorage.removeItem('charmsWallet');
    }
}

// Export for global compatibility
window.CharmsWallet = WalletService;
