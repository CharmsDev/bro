// Wallet Address Generation - Pure generation logic
import { environmentConfig } from '../../config/environment.js';

export class WalletGenerator {
    constructor() {
        this.network = environmentConfig.getNetwork();
    }

    // Generate a proper BIP39-compliant 12-word seed phrase
    generateSeedPhrase() {
        const bip39 = window.bip39;
        if (!bip39) {
            throw new Error('BIP39 library not available');
        }
        return bip39.generateMnemonic(128);
    }

    // Generate single Taproot address
    async generateAddress(seedPhrase, index = 0) {
        const bitcoin = window.bitcoin;
        const bip39 = window.bip39;
        const bip32 = window.bip32;

        if (!bitcoin || !bip39 || !bip32) {
            throw new Error('Required libraries not available');
        }

        if (!bip39.validateMnemonic(seedPhrase)) {
            throw new Error('Invalid seed phrase');
        }

        const network = this.network.includes('testnet') ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
        const seed = await bip39.mnemonicToSeed(seedPhrase);
        const masterNode = bip32.fromSeed(seed, network);

        const coinType = this.network.includes('testnet') ? "1'" : "0'";
        const derivationPath = `m/86'/${coinType}/0'`;
        const accountNode = masterNode.derivePath(derivationPath);
        const chainNode = accountNode.derive(0);
        const addressNode = chainNode.derive(index);

        const pubkey = addressNode.publicKey;
        const xOnlyPubkey = Buffer.from(pubkey.slice(1, 33));

        const { address } = bitcoin.payments.p2tr({
            internalPubkey: xOnlyPubkey,
            network,
        });

        return address;
    }

    // Generate change address (index 1)
    generateChangeAddress(seedPhrase) {
        return this.generateAddress(seedPhrase, 1);
    }

    // rjj: Generate 24 addresses (12 recipient + 12 change)
    async generateExtendedAddresses(seedPhrase) {
        
        const addresses = {
            recipient: [],
            change: []
        };

        // Generate 12 recipient addresses (chain 0)
        for (let i = 0; i < 12; i++) {
            const keyData = await this.generateTaprootKeysForChainAndIndex(seedPhrase, 0, i);
            addresses.recipient.push({
                ...keyData,
                type: 'recipient',
                chain: 0,
                addressIndex: i
            });
        }

        // Generate 12 change addresses (chain 1)
        for (let i = 0; i < 12; i++) {
            const keyData = await this.generateTaprootKeysForChainAndIndex(seedPhrase, 1, i);
            addresses.change.push({
                ...keyData,
                type: 'change',
                chain: 1,
                addressIndex: i
            });
        }

        return addresses;
    }

    // Generate keys for specific chain and index
    async generateTaprootKeysForChainAndIndex(seedPhrase, chain, index) {
        const bitcoin = window.bitcoin;
        const bip39 = window.bip39;
        const bip32 = window.bip32;
        const ecc = window.ecc;

        if (!bitcoin || !bip39 || !bip32 || !ecc) {
            throw new Error('Required libraries not available');
        }

        const seed = await bip39.mnemonicToSeed(seedPhrase);
        const network = this.network.includes('testnet') ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
        const masterNode = bip32.fromSeed(seed, network);

        const coinType = this.network.includes('testnet') ? "1'" : "0'";
        const derivationPath = `m/86'/${coinType}/0'/${chain}/${index}`;
        const addressNode = masterNode.derivePath(derivationPath);

        const privateKey = addressNode.privateKey;
        const xOnlyPubkey = Buffer.from(addressNode.publicKey.slice(1, 33));
        const tweakedPrivateKey = ecc.privateAdd(privateKey, bitcoin.crypto.taggedHash('TapTweak', xOnlyPubkey));

        const p2tr = bitcoin.payments.p2tr({
            internalPubkey: xOnlyPubkey,
            network
        });

        return {
            index,
            chain,
            address: p2tr.address,
            derivationPath,
            privateKey: privateKey.toString('hex'), // Store as hex string
            tweakedPrivateKey: tweakedPrivateKey.toString('hex'),
            xOnlyPubkey: xOnlyPubkey.toString('hex'), // For signing
            internalPubkey: xOnlyPubkey.toString('hex'),
            script: p2tr.output.toString('hex'),
            network: this.network // Save network info
        };
    }

    // Legacy: Generate first 3 addresses for compatibility
    async generateMultipleAddresses(seedPhrase, count = 3) {
        const addresses = [];
        for (let i = 0; i < count; i++) {
            const keyData = await this.generateTaprootKeysForIndex(seedPhrase, i);
            addresses.push(keyData);
        }
        return addresses;
    }

    // Legacy: Generate keys for index (chain 0 only)
    async generateTaprootKeysForIndex(seedPhrase, index) {
        return await this.generateTaprootKeysForChainAndIndex(seedPhrase, 0, index);
    }

    // Get derivation path
    getDerivationPath() {
        const coinType = this.network.includes('testnet') ? "1'" : "0'";
        return `m/86'/${coinType}/0'`;
    }
}
