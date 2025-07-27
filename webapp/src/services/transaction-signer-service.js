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
}

// Export for use in other modules
window.ScureBitcoinTransactionSigner = ScureBitcoinTransactionSigner;
export { ScureBitcoinTransactionSigner };
