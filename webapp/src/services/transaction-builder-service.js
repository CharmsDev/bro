// Bitcoin Transaction Builder class for creating transactions with mining data
import { environmentConfig } from '../config/environment.js';

class BitcoinTxBuilder {
    constructor() {
        this.network = environmentConfig.getNetwork();
        this.apiService = new window.BitcoinAPIService();
    }

    stringToBuffer(str) {
        return new TextEncoder().encode(str);
    }

    // Create a transaction with OP_RETURN data containing hash and nonce
    async createMiningDataTransaction(utxo, miningResult, changeAddress, seedPhrase) {
        try {
            const bitcoin = window.bitcoin;
            const bip39 = window.bip39;
            const bip32 = window.bip32;
            const network = this.network.includes('testnet') ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;

            if (!bitcoin || !bip39 || !bip32) {
                throw new Error('Required Bitcoin libraries not available');
            }

            // Derive the private key for signing
            const seed = await bip39.mnemonicToSeed(seedPhrase);
            const masterNode = bip32.fromSeed(seed, network);
            // Testnet4 uses coin type 1', mainnet uses coin type 0'
            const coinType = this.network.includes('testnet') ? "1'" : "0'";
            const derivationPath = `m/86'/${coinType}/0'`;
            const accountNode = masterNode.derivePath(derivationPath);
            const chainNode = accountNode.derive(0); // receiving chain
            const addressNode = chainNode.derive(0); // Use index 0 for the main receiving address

            // Get the private key and x-only public key
            const privateKey = addressNode.privateKey;
            const xOnlyPubkey = Buffer.from(addressNode.publicKey.slice(1, 33));

            // Create PSBT for proper Taproot signing
            const psbt = new bitcoin.Psbt({ network });

            // Add input with proper Taproot witness UTXO
            // Convert TXID from hex string to Buffer (bitcoinjs-lib handles endianness)
            const txidBuffer = Buffer.from(utxo.txid, 'hex').reverse(); // Reverse for little-endian

            psbt.addInput({
                hash: txidBuffer,
                index: utxo.vout,
                witnessUtxo: {
                    script: bitcoin.address.toOutputScript(utxo.address, network),
                    value: utxo.amount,
                },
                tapInternalKey: xOnlyPubkey,
            });

            // Create optimized OP_RETURN data with only nonce in the exact form it is used in the hash
            // Format: nonceBuffer: byte buffer encoded from string representation of a number
            const nonceBuffer = this.stringToBuffer(miningResult.nonce.toString());

            // Output 0: OP_RETURN with mining data (0 sats)
            const opReturnScript = bitcoin.script.compile([
                bitcoin.opcodes.OP_RETURN,
                Buffer.from(nonceBuffer)
            ]);
            psbt.addOutput({
                script: opReturnScript,
                value: 0,
            });

            // Output 1: 777 satoshis output
            const fixedAmount = 777;
            psbt.addOutput({
                address: changeAddress,
                value: fixedAmount,
            });

            // Output 2: Change amount (remaining funds minus fees and 777 sats)
            const feeAmount = 1000; // 1000 satoshis fee
            const changeAmount = utxo.amount - feeAmount - fixedAmount;

            if (changeAmount > 0) {
                psbt.addOutput({
                    address: changeAddress,
                    value: changeAmount,
                });
            }

            // Get the PSBT hex directly (no need to finalize or extract)
            const psbtHex = psbt.toHex();

            // Create a transaction object for compatibility
            const tx = {
                getId: () => bitcoin.crypto.sha256(bitcoin.crypto.sha256(Buffer.from(psbtHex, 'hex'))).reverse().toString('hex'),
                toHex: () => psbtHex,
                virtualSize: () => psbtHex.length / 2
            };


            // Add compatibility methods for existing code
            tx.calculateTxId = function () {
                return Promise.resolve(this.getId());
            };

            tx.serialize = function () {
                return this.toHex();
            };

            tx.getSize = function () {
                return this.virtualSize();
            };

            return tx;

        } catch (error) {
            console.error('Transaction creation failed:', error.message);
            throw error;
        }
    }

    // Create P2WPKH script (simplified)
    createP2WPKHScript(address) {
        // This is a simplified version - in reality you'd decode the address
        // For demo purposes, we'll create a mock script
        return '0014' + '0'.repeat(40); // OP_0 + 20 bytes pubkey hash
    }

    // Monitor address for UTXOs using real API
    async monitorAddress(address, onUtxoFound, onStatusUpdate, onError) {
        return this.apiService.monitorAddress(address, onUtxoFound, onStatusUpdate, onError);
    }

    // Validate UTXO has sufficient funds
    validateUtxo(utxo, minimumAmount = 2777) { // Updated minimum: 777 + 1000 fee + some change
        if (!utxo) {
            throw new Error('UTXO is required');
        }

        if (!utxo.txid || !utxo.hasOwnProperty('vout') || !utxo.amount) {
            throw new Error('Invalid UTXO format');
        }

        if (utxo.amount < minimumAmount) {
            throw new Error(`UTXO amount (${utxo.amount}) is below minimum (${minimumAmount})`);
        }

        return true;
    }

    // Validate mining result
    validateMiningResult(miningResult) {
        if (!miningResult) {
            throw new Error('Mining result is required');
        }

        if (!miningResult.hash || !miningResult.hasOwnProperty('nonce')) {
            throw new Error('Invalid mining result format');
        }

        if (typeof miningResult.hash !== 'string' || miningResult.hash.length < 32) {
            throw new Error('Invalid hash format');
        }

        if (typeof miningResult.nonce !== 'number' || miningResult.nonce < 0) {
            throw new Error('Invalid nonce format');
        }

        return true;
    }

    // Create transaction with full validation
    async createValidatedTransaction(utxo, miningResult, changeAddress, seedPhrase) {
        // Validate inputs
        this.validateUtxo(utxo);
        this.validateMiningResult(miningResult);

        if (!changeAddress) {
            throw new Error('Change address is required');
        }

        if (!seedPhrase) {
            throw new Error('Seed phrase is required for signing');
        }

        // Create transaction
        return this.createMiningDataTransaction(utxo, miningResult, changeAddress, seedPhrase);
    }
}

// Export for use in other scripts
window.BitcoinTxBuilder = BitcoinTxBuilder;
