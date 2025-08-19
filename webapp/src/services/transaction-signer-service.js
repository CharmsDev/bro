// transaction-signer-scure.js - Using @scure/btc-signer for robust Taproot support
import * as btc from '@scure/btc-signer';
import { hex } from '@scure/base';

class ScureBitcoinTransactionSigner {
    constructor() {
        // @scure/btc-signer uses different network constants
        this.network = btc.NETWORK; // mainnet
        this.testnet = btc.TEST_NETWORK; // testnet
        this.currentNetwork = this.testnet; // Use testnet for our app
    }

    // Derive Taproot keys using @scure/btc-signer
    async deriveTapKeys(mnemonic, path = "m/86'/0'/0'") {
        // Import bip39 and bip32 from @scure packages
        const { mnemonicToSeed } = await import('@scure/bip39');
        const { HDKey } = await import('@scure/bip32');

        const seed = await mnemonicToSeed(mnemonic);
        const hdkey = HDKey.fromMasterSeed(seed);

        // Derive step by step for Taproot: m/86'/0'/0'/0/0
        // Purpose: 86' (Taproot)
        const purposeKey = hdkey.deriveChild(86 + 0x80000000); // hardened
        // Coin type: 0' (Bitcoin testnet uses 1', but we'll use 0' for consistency)
        const coinKey = purposeKey.deriveChild(0 + 0x80000000); // hardened
        // Account: 0'
        const accountKey = coinKey.deriveChild(0 + 0x80000000); // hardened
        // Change: 0 (receiving addresses)
        const chainKey = accountKey.deriveChild(0); // not hardened
        // Address index: 0
        const addressKey = chainKey.deriveChild(0); // not hardened

        if (!addressKey.privateKey) {
            throw new Error('Failed to derive private key');
        }

        // Create Taproot payment using @scure/btc-signer
        // Use x-only pubkey (32 bytes) for Taproot
        const xOnlyPubkey = addressKey.publicKey.slice(1); // Remove 0x02/0x03 prefix
        const p2tr = btc.p2tr(xOnlyPubkey, undefined, this.currentNetwork);

        return {
            privateKey: addressKey.privateKey,
            publicKey: addressKey.publicKey,
            p2tr: p2tr,
            address: p2tr.address
        };
    }

    // Sign PSBT using @scure/btc-signer
    async signPSBT(psbtHex, utxo, mnemonic, path = "m/86'/0'/0'") {
        try {
            console.log('[ScureSigner] Starting PSBT signing...');
            console.log('[ScureSigner] Using derivation path:', path);

            // Parse PSBT
            const psbt = btc.Transaction.fromPSBT(hex.decode(psbtHex), {
                network: this.currentNetwork
            });

            console.log('[ScureSigner] PSBT parsed successfully');

            // Derive keys - ensure we have a valid path
            const derivationPath = path || "m/86'/0'/0'";
            const { privateKey, p2tr } = await this.deriveTapKeys(mnemonic, derivationPath);

            console.log('[ScureSigner] Keys derived successfully');
            console.log('[ScureSigner] Address:', p2tr.address);

            // Update input with witnessUtxo if needed
            if (psbt.inputsLength > 0) {
                const input = psbt.getInput(0);
                if (!input.witnessUtxo) {
                    // Use the script from our p2tr payment
                    const scriptPubKey = p2tr.script;

                    psbt.updateInput(0, {
                        witnessUtxo: {
                            script: scriptPubKey,
                            amount: BigInt(utxo.amount)
                        }
                    });

                    console.log('[ScureSigner] Updated witnessUtxo');
                }
            }

            // Sign the transaction
            psbt.sign(privateKey);
            console.log('[ScureSigner] Transaction signed');

            // Finalize
            psbt.finalize();
            console.log('[ScureSigner] Transaction finalized');

            // Extract final transaction
            const finalTx = psbt.extract();
            const txHex = hex.encode(finalTx);
            const txId = btc.Transaction.fromRaw(finalTx, {
                network: this.currentNetwork,
                allowUnknownOutputs: true // Allow OP_RETURN and other unknown output types
            }).id;

            console.log('[ScureSigner] ✅ Transaction successfully signed and finalized');
            console.log('[ScureSigner] TXID:', txId);

            return {
                success: true,
                txid: txId,
                signedTxHex: txHex,
                signedTx: {
                    getId: () => txId,
                    toHex: () => txHex,
                    virtualSize: () => finalTx.length // Approximate
                }
            };

        } catch (error) {
            console.error('[ScureSigner] Error signing PSBT:', error);
            throw new Error(`Failed to sign PSBT: ${error.message}`);
        }
    }

    // Sign prover transactions (multiple transactions from prover API response)
    async signProverTransactions(transactionHexArray, wallet) {
        console.log(`🔐 Signing ${transactionHexArray.length} prover transactions...`);

        const signedTransactions = [];

        for (let i = 0; i < transactionHexArray.length; i++) {
            const txHex = transactionHexArray[i];
            console.log(`🔐 Signing transaction ${i + 1}/${transactionHexArray.length}`);

            try {
                // Convert raw transaction hex to PSBT format for signing
                const psbtHex = await this.convertTxToPSBT(txHex, wallet);

                // Sign the PSBT
                const signedResult = await this.signPSBT(
                    psbtHex,
                    { amount: 777 }, // Standard amount for BRO tokens
                    wallet.seedPhrase || wallet.mnemonic
                );

                signedTransactions.push({
                    index: i,
                    originalHex: txHex,
                    signedHex: signedResult.signedTxHex,
                    txid: signedResult.txid
                });

                console.log(`✅ Transaction ${i + 1} signed: ${signedResult.txid}`);

            } catch (error) {
                console.error(`❌ Error signing transaction ${i + 1}:`, error);
                throw new Error(`Failed to sign transaction ${i + 1}: ${error.message}`);
            }
        }

        console.log(`✅ All ${signedTransactions.length} transactions signed successfully`);
        return signedTransactions;
    }

    // Convert raw transaction hex to PSBT format
    async convertTxToPSBT(txHex, wallet) {
        try {
            console.log('[ScureSigner] Converting transaction to PSBT format...');

            // Parse the raw transaction
            const txBytes = hex.decode(txHex);
            const tx = btc.Transaction.fromRaw(txBytes, {
                network: this.currentNetwork,
                allowUnknownOutputs: true
            });

            // Create a new PSBT from the transaction
            const psbt = new btc.Transaction({
                version: tx.version,
                lockTime: tx.lockTime
            });

            // Add inputs
            for (let i = 0; i < tx.inputsLength; i++) {
                const input = tx.getInput(i);
                psbt.addInput({
                    txid: input.txid,
                    index: input.index,
                    sequence: input.sequence
                });
            }

            // Add outputs
            for (let i = 0; i < tx.outputsLength; i++) {
                const output = tx.getOutput(i);
                psbt.addOutput({
                    script: output.script,
                    amount: output.amount
                });
            }

            // Convert to PSBT bytes and then to hex
            const psbtBytes = psbt.toPSBT();
            const psbtHex = hex.encode(psbtBytes);

            console.log('[ScureSigner] ✅ Transaction converted to PSBT');
            return psbtHex;

        } catch (error) {
            console.error('[ScureSigner] Error converting to PSBT:', error);
            throw new Error(`Failed to convert transaction to PSBT: ${error.message}`);
        }
    }

    // Sign a single raw transaction hex
    async signRawTransaction(txHex, wallet, inputUtxos = []) {
        console.log('[ScureSigner] Signing raw transaction...');

        try {
            // For prover transactions, we need to handle them differently
            // They come as complete transactions that need to be signed

            const txBytes = hex.decode(txHex);
            const tx = btc.Transaction.fromRaw(txBytes, {
                network: this.currentNetwork,
                allowUnknownOutputs: true
            });

            console.log('[ScureSigner] Transaction parsed, TXID:', tx.id);

            // Derive wallet keys
            const { privateKey, p2tr } = await this.deriveTapKeys(wallet.seedPhrase || wallet.mnemonic);

            // Create a new transaction for signing
            const signedTx = new btc.Transaction({
                version: tx.version,
                lockTime: tx.lockTime
            });

            // Copy inputs and add witness data
            for (let i = 0; i < tx.inputsLength; i++) {
                const input = tx.getInput(i);
                signedTx.addInput({
                    txid: input.txid,
                    index: input.index,
                    sequence: input.sequence,
                    witnessUtxo: {
                        script: p2tr.script,
                        amount: BigInt(777) // Standard BRO token amount
                    }
                });
            }

            // Copy outputs
            for (let i = 0; i < tx.outputsLength; i++) {
                const output = tx.getOutput(i);
                signedTx.addOutput({
                    script: output.script,
                    amount: output.amount
                });
            }

            // Sign all inputs
            for (let i = 0; i < signedTx.inputsLength; i++) {
                signedTx.signIdx(privateKey, i);
            }

            // Finalize
            signedTx.finalize();

            const finalTx = signedTx.extract();
            const finalTxHex = hex.encode(finalTx);
            const finalTxId = btc.Transaction.fromRaw(finalTx, {
                network: this.currentNetwork,
                allowUnknownOutputs: true
            }).id;

            console.log('[ScureSigner] ✅ Raw transaction signed:', finalTxId);

            return {
                success: true,
                txid: finalTxId,
                signedTxHex: finalTxHex,
                originalHex: txHex
            };

        } catch (error) {
            console.error('[ScureSigner] Error signing raw transaction:', error);
            throw new Error(`Failed to sign raw transaction: ${error.message}`);
        }
    }

    // Validate signed transactions
    validateSignedTransactions(signedTransactions) {
        console.log('🔍 Validating signed transactions...');

        for (let i = 0; i < signedTransactions.length; i++) {
            const tx = signedTransactions[i];

            // Check required fields
            if (!tx.signedHex || !tx.txid) {
                throw new Error(`Transaction ${i + 1} missing required fields`);
            }

            // Validate hex format
            if (!/^[0-9a-fA-F]+$/.test(tx.signedHex)) {
                throw new Error(`Transaction ${i + 1} has invalid hex format`);
            }

            // Validate TXID format
            if (!/^[0-9a-fA-F]{64}$/.test(tx.txid)) {
                throw new Error(`Transaction ${i + 1} has invalid TXID format`);
            }
        }

        console.log('✅ All signed transactions validated');
        return true;
    }
}

// Export for use in other modules
window.ScureBitcoinTransactionSigner = ScureBitcoinTransactionSigner;
export { ScureBitcoinTransactionSigner };
