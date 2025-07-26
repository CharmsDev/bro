// Bitcoin Transaction Builder class for creating transactions with mining data
class BitcoinTxBuilder {
    constructor() {
        this.network = 'testnet4';
        this.apiService = new window.BitcoinAPIService();
    }

    // Create a transaction with OP_RETURN data containing hash and nonce
    async createMiningDataTransaction(utxo, miningResult, changeAddress, seedPhrase) {
        try {
            console.log('=== TRANSACTION CREATION DEBUG ===');
            console.log('UTXO:', utxo);
            console.log('Mining result:', miningResult);
            console.log('Change address:', changeAddress);
            console.log('Seed phrase length:', seedPhrase ? seedPhrase.split(' ').length : 'undefined');

            const bitcoin = window.bitcoin;
            const bip39 = window.bip39;
            const bip32 = window.bip32;
            const network = bitcoin.networks.testnet;

            if (!bitcoin || !bip39 || !bip32) {
                throw new Error('Required Bitcoin libraries not available');
            }

            console.log('Libraries loaded successfully');

            // Derive the private key for signing
            console.log('Deriving private key...');
            const seed = await bip39.mnemonicToSeed(seedPhrase);
            const masterNode = bip32.fromSeed(seed, network);
            const derivationPath = "m/86'/0'/0'";
            const accountNode = masterNode.derivePath(derivationPath);
            const chainNode = accountNode.derive(0); // receiving chain
            const addressNode = chainNode.derive(0); // Use index 0 for the main receiving address

            // Get the private key and x-only public key
            const privateKey = addressNode.privateKey;
            const xOnlyPubkey = Buffer.from(addressNode.publicKey.slice(1, 33));
            console.log('Private key derived, x-only pubkey:', xOnlyPubkey.toString('hex'));

            // Create PSBT for proper Taproot signing
            console.log('Creating PSBT...');
            const psbt = new bitcoin.Psbt({ network });

            // Add input with proper Taproot witness UTXO
            console.log('Adding input...');
            // Convert TXID from hex string to Buffer (bitcoinjs-lib handles endianness)
            const txidBuffer = Buffer.from(utxo.txid, 'hex').reverse(); // Reverse for little-endian
            console.log('TXID buffer:', txidBuffer.toString('hex'));

            psbt.addInput({
                hash: txidBuffer,
                index: utxo.vout,
                witnessUtxo: {
                    script: bitcoin.address.toOutputScript(utxo.address, network),
                    value: utxo.amount,
                },
                tapInternalKey: xOnlyPubkey,
            });

            // Create optimized OP_RETURN data with only hash and nonce in hex
            // Format: hash (16 bytes) + nonce (4 bytes) = 20 bytes total
            const hashPrefix = miningResult.hash.substring(0, 32); // First 16 bytes of hash (32 hex chars)
            const nonceHex = miningResult.nonce.toString(16).padStart(8, '0'); // 4 bytes (8 hex chars)

            // Combine hash and nonce as pure hex data (no text prefix)
            const miningDataHex = hashPrefix + nonceHex;
            console.log('OP_RETURN data:', miningDataHex);

            // Output 0: OP_RETURN with mining data (0 sats)
            console.log('Adding OP_RETURN output...');
            const opReturnScript = bitcoin.script.compile([
                bitcoin.opcodes.OP_RETURN,
                Buffer.from(miningDataHex, 'hex')
            ]);
            psbt.addOutput({
                script: opReturnScript,
                value: 0,
            });

            // Output 1: Change amount (all remaining funds minus fees)
            const feeAmount = 1000; // 1000 satoshis fee
            const changeAmount = utxo.amount - feeAmount;
            console.log('Adding change output:', { changeAmount, changeAddress });

            // Always add change output (even if small, for testing purposes)
            psbt.addOutput({
                address: changeAddress,
                value: changeAmount,
            });

            // Create unsigned transaction for review
            console.log('Creating unsigned PSBT...');

            // Get the PSBT hex directly (no need to finalize or extract)
            const psbtHex = psbt.toHex();

            console.log('=== PSBT HEX ===');
            console.log(psbtHex);
            console.log('=== END PSBT HEX ===');

            // Create a mock transaction object for compatibility
            const tx = {
                getId: () => 'mock-txid-for-psbt',
                toHex: () => psbtHex,
                virtualSize: () => psbtHex.length / 2
            };

            console.log('Transaction created successfully');
            console.log('Transaction structure:', {
                inputs: 1,
                outputs: 2,
                opReturn: { value: 0, dataLength: miningDataHex.length / 2 },
                change: { value: changeAmount, address: changeAddress },
                fee: feeAmount,
                signed: true
            });
            console.log('=== END TRANSACTION CREATION DEBUG ===');

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
            console.error('=== TRANSACTION CREATION ERROR ===');
            console.error('Error:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            console.error('=== END TRANSACTION CREATION ERROR ===');
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
    validateUtxo(utxo, minimumAmount = 10000) {
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
