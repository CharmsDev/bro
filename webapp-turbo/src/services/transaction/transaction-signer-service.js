// transaction-signer-scure.js - Using @scure/btc-signer for robust Taproot support
import * as btc from '@scure/btc-signer';
import { hex } from '@scure/base';
import { environmentConfig } from '../../config/environment.js';
import { WalletService } from '../wallet/WalletService.js';

class ScureBitcoinTransactionSigner {
    constructor() {
        // @scure/btc-signer uses different network constants
        this.network = btc.NETWORK; // mainnet
        this.testnet = btc.TEST_NETWORK; // testnet
        // Use environment config to determine network
        this.currentNetwork = environmentConfig.isTestnet() ? this.testnet : this.network;
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
                
                // Debug UTXO data
                
                const amount = utxo.amount || utxo.value;
                if (!amount) {
                    throw new Error('UTXO amount is undefined. Available fields: ' + Object.keys(utxo).join(', '));
                }
                
                const updateData = {
                    witnessUtxo: {
                        script: p2tr.script,
                        amount: BigInt(amount)
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
            throw new Error(`Failed to sign PSBT: ${error.message}`);
        }
    }

    // Sign PSBT with pre-generated private key (no derivation needed)
    async signPSBTWithPrivateKey(psbtHex, utxo, privateKeyHex, xOnlyPubkeyHex) {
        try {
            
            // Parse PSBT
            const psbt = btc.Transaction.fromPSBT(hex.decode(psbtHex), {
                network: this.currentNetwork
            });

            // Convert to Uint8Array (required by @scure)
            // privateKey might be stored as comma-separated bytes or hex string
            let privateKey;
            if (privateKeyHex.includes(',')) {
                // Format: "80,7,6,142,..." -> Uint8Array
                const bytes = privateKeyHex.split(',').map(b => parseInt(b.trim()));
                privateKey = new Uint8Array(bytes);
            } else {
                // Format: "50076e8e..." -> Uint8Array
                privateKey = hex.decode(privateKeyHex);
            }
            
            const xOnlyPubkey = hex.decode(xOnlyPubkeyHex);
            
            
            // Create p2tr for script
            const p2tr = btc.p2tr(xOnlyPubkey, undefined, this.currentNetwork);
            
            // Update input with Taproot-specific data
            if (psbt.inputsLength > 0) {
                const amount = utxo.amount || utxo.value;
                if (!amount) {
                    throw new Error('UTXO amount is undefined');
                }
                
                const updateData = {
                    witnessUtxo: {
                        script: p2tr.script,
                        amount: BigInt(amount)
                    },
                    tapInternalKey: xOnlyPubkey
                };
                
                psbt.updateInput(0, updateData);
            }

            // Sign with private key
            psbt.signIdx(privateKey, 0);
            psbt.finalize();

            // Extract final transaction
            const finalTx = psbt.extract();
            const txHex = hex.encode(finalTx);
            const txId = btc.Transaction.fromRaw(finalTx, {
                network: this.currentNetwork,
                allowUnknownOutputs: true
            }).id;

            return {
                success: true,
                txid: txId,
                signedTxHex: txHex,
                signedTx: {
                    getId: () => txId,
                    toHex: () => txHex,
                    virtualSize: () => finalTx.length
                }
            };

        } catch (error) {
            throw new Error(`Failed to sign PSBT: ${error.message}`);
        }
    }

    // Determine the correct derivation path for mining transactions
    getMiningDerivationPath() {
        // Use correct coin type based on network (same as WalletService)
        // Testnet uses coin type 1', mainnet uses coin type 0'
        const coinType = environmentConfig.isTestnet() ? "1'" : "0'";
        const derivationPath = `m/86'/${coinType}/0'`;
        return derivationPath;
    }
}

// Export for use in other modules
export { ScureBitcoinTransactionSigner };
