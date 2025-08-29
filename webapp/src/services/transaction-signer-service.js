// transaction-signer-scure.js - Using @scure/btc-signer for robust Taproot support
import * as btc from '@scure/btc-signer';
import { hex } from '@scure/base';
import { WalletService } from './wallet-service.js';

class ScureBitcoinTransactionSigner {
    constructor() {
        // @scure/btc-signer uses different network constants
        this.network = btc.NETWORK; // mainnet
        this.testnet = btc.TEST_NETWORK; // testnet
        this.currentNetwork = this.testnet; // Use testnet for our app
        this.walletService = new WalletService();
    }

    // Derive Taproot keys using @scure/btc-signer
    async deriveTapKeys(mnemonic, path = null) {
        // Use default mining path if none provided
        const derivationPath = path || this.getMiningDerivationPath();
        
        // Import bip39 and bip32 from @scure packages
        const { mnemonicToSeed } = await import('@scure/bip39');
        const { HDKey } = await import('@scure/bip32');

        const seed = await mnemonicToSeed(mnemonic);
        const hdkey = HDKey.fromMasterSeed(seed);

        // Parse the derivation path dynamically instead of hardcoding
        // Expected format: m/86'/1'/0'/0/0 or m/86'/0'/0'/0/0
        const pathParts = derivationPath.replace('m/', '').split('/');
        
        let currentKey = hdkey;
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            const isHardened = part.endsWith("'");
            const index = parseInt(part.replace("'", ""));
            const derivationIndex = isHardened ? index + 0x80000000 : index;
            
            currentKey = currentKey.deriveChild(derivationIndex);
        }
        
        const addressKey = currentKey;

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
            // Parse PSBT
            const psbt = btc.Transaction.fromPSBT(hex.decode(psbtHex), {
                network: this.currentNetwork
            });

            // Derive keys - ensure we have a valid path
            const derivationPath = path || "m/86'/0'/0'";
            const { privateKey, p2tr } = await this.deriveTapKeys(mnemonic, derivationPath);

            // Update input with Taproot-specific data
            if (psbt.inputsLength > 0) {
                // Get the x-only public key - need to find the correct property
                let xOnlyPubkey;
                if (p2tr.pubkey) {
                    xOnlyPubkey = Buffer.from(p2tr.pubkey);
                } else if (p2tr.internalPubkey) {
                    xOnlyPubkey = Buffer.from(p2tr.internalPubkey);
                } else {
                    // Extract from the derived keys
                    const { publicKey } = await this.deriveTapKeys(mnemonic, derivationPath);
                    xOnlyPubkey = publicKey.length === 33 ? publicKey.slice(1) : publicKey;
                }
                
                const updateData = {
                    witnessUtxo: {
                        script: p2tr.script,
                        amount: BigInt(utxo.amount)
                    },
                    tapInternalKey: xOnlyPubkey // x-only internal pubkey for key-path spending
                };
                
                psbt.updateInput(0, updateData);
            }

            // For @scure, we need to sign each input individually
            try {
                psbt.signIdx(privateKey, 0); // Sign input at index 0
            } catch (signError) {
                // Fallback: try the general sign method
                psbt.sign(privateKey);
            }

            // Finalize
            psbt.finalize();

            // Extract final transaction
            const finalTx = psbt.extract();
            const txHex = hex.encode(finalTx);
            const txId = btc.Transaction.fromRaw(finalTx, {
                network: this.currentNetwork,
                allowUnknownOutputs: true // Allow OP_RETURN and other unknown output types
            }).id;


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

    // Sign mining transaction (Step 3/4) - Main entry point for Transaction Manager
    async signMiningTransaction(unsignedTx, utxo) {
        try {
            // Get seed phrase from WalletService
            const seedPhrase = this.walletService.getSeedPhrase();
            if (!seedPhrase) {
                throw new Error('Seed phrase not found in wallet');
            }
            
            // Transaction Signer determines the correct derivation path
            let derivationPath = this.getMiningDerivationPath();
            
            // Test different indices to find matching address
            const keys0 = await this.walletService.generateTaprootKeysForIndex(seedPhrase, 0);
            const keys1 = await this.walletService.generateTaprootKeysForIndex(seedPhrase, 1);
            
            let matchingIndex = -1;
            let matchingKeys = null;
            
            if (keys0.address === utxo.address) {
                matchingIndex = 0;
                matchingKeys = keys0;
            } else if (keys1.address === utxo.address) {
                matchingIndex = 1;
                matchingKeys = keys1;
            }
            
            if (matchingIndex >= 0) {
                // Use the correct derivation path that matches the UTXO address
                derivationPath = matchingKeys.derivationPath;
            } else {
                throw new Error('No matching address found for UTXO. Address mismatch will cause signature failure.');
            }
            
            const psbtHex = unsignedTx.serialize();
            
            const utxoWithScript = {
                ...utxo,
                address: utxo.address
            };

            const signResult = await this.signPSBT(
                psbtHex,
                utxoWithScript,
                seedPhrase,
                derivationPath
            );

            return {
                txid: signResult.txid,
                signedTxHex: signResult.signedTxHex,
                size: signResult.signedTx.virtualSize()
            };

        } catch (error) {
            throw new Error(`Failed to sign mining transaction: ${error.message}`);
        }
    }

    // Determine the correct derivation path for mining transactions
    getMiningDerivationPath() {
        // Use WalletService for network-aware derivation path with index 0
        const basePath = this.walletService.getDerivationPath();
        // Add index 0 for primary address (same as WalletService generateAddress with index 0)
        return `${basePath}/0/0`;
    }

    // Sign prover transactions (multiple transactions from prover API response)
    async signProverTransactions(transactionHexArray, wallet) {

        const signedTransactions = [];

        for (let i = 0; i < transactionHexArray.length; i++) {
            const txHex = transactionHexArray[i];

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


            } catch (error) {
                console.error(`❌ Error signing transaction ${i + 1}:`, error);
                throw new Error(`Failed to sign transaction ${i + 1}: ${error.message}`);
            }
        }

        return signedTransactions;
    }

    // Convert raw transaction hex to PSBT format
    async convertTxToPSBT(txHex, wallet) {
        try {

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

            return psbtHex;

        } catch (error) {
            console.error('[ScureSigner] Error converting to PSBT:', error);
            throw new Error(`Failed to convert transaction to PSBT: ${error.message}`);
        }
    }

    // Sign a single raw transaction hex
    async signRawTransaction(txHex, wallet, inputUtxos = []) {

        try {
            // For prover transactions, we need to handle them differently
            // They come as complete transactions that need to be signed

            const txBytes = hex.decode(txHex);
            const tx = btc.Transaction.fromRaw(txBytes, {
                network: this.currentNetwork,
                allowUnknownOutputs: true
            });


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

        return true;
    }
}

// Export for use in other modules
window.ScureBitcoinTransactionSigner = ScureBitcoinTransactionSigner;
export { ScureBitcoinTransactionSigner };
