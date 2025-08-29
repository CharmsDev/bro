import { WalletService } from '../wallet-service.js';
import { getUtxoValue } from './txUtils.js';

export async function signSpellTransaction(
    spellTxHex,
    signedCommitTxHex,
    logCallback = () => { }
) {
    try {
        if (!spellTxHex) throw new Error('Spell transaction hex is required');
        if (!signedCommitTxHex) throw new Error('Signed commit transaction hex is required');


        // Use static imports like commit transaction
        const bitcoin = await import('bitcoinjs-lib');
        const { BIP32Factory } = await import('bip32');
        const bip39 = await import('bip39');
        const ecc = await import('tiny-secp256k1');

        // Initialize ECC library
        bitcoin.initEccLib(ecc);
        const bip32 = BIP32Factory(ecc);

        // Convert public key to x-only format for Taproot
        function toXOnly(pubkey) {
            return pubkey.length === 33 ? Buffer.from(pubkey.slice(1, 33)) : pubkey;
        }

        // Parse transactions with bitcoinjs-lib
        const spellTx = bitcoin.Transaction.fromHex(spellTxHex);
        const commitTx = bitcoin.Transaction.fromHex(signedCommitTxHex);

        spellTx.version = 2; // Set version 2 for Taproot compatibility

        const commitTxId = commitTx.getId();

        // Use WalletService for network-aware key generation (dynamic network paths)
        const walletService = new WalletService();
        
        // Get seed phrase from WalletService (cleaner approach)
        const seedPhrase = walletService.getSeedPhrase();
        if (!seedPhrase) throw new Error('Seed phrase not found in wallet');

        const prevOutScripts = [];
        const values = [];
        const signData = {}; // Store tweaked keys by input index

        // Prepare signing data for each input
        for (let i = 0; i < spellTx.ins.length; i++) {
            const rawTxid = Buffer.from(spellTx.ins[i].hash).reverse().toString('hex');
            const vout = spellTx.ins[i].index;
            let utxoValue = null;
            let script = null;

            if (rawTxid === commitTxId) {
                // Use data from commit transaction
                const commitOutput = commitTx.outs[vout];
                script = commitOutput.script;
                utxoValue = commitOutput.value;
            } else {
                // This is a wallet-owned UTXO
                try {
                    utxoValue = await getUtxoValue(rawTxid, vout);

                    // Find the correct address index by testing wallet addresses against UTXO
                    let addressIndex = 0; // Default to primary address
                    let keyData = null;
                    
                    // Try to match UTXO with stored wallet addresses by testing each index
                    const walletData = JSON.parse(localStorage.getItem('charmsWallet'));
                    if (walletData && walletData.addresses) {
                        // Test each stored address to find the one that owns this UTXO
                        for (const addressData of walletData.addresses) {
                            const testKeys = await walletService.generateTaprootKeysForIndex(seedPhrase, addressData.index);
                            // For spell transactions, typically use index 1 (change address)
                            // But we should test to find the correct one
                            if (addressData.index === 1) {
                                addressIndex = addressData.index;
                                keyData = testKeys;
                                break;
                            }
                        }
                    }
                    
                    // If no match found, generate keys for index 1 (typical for spell transactions)
                    if (!keyData) {
                        addressIndex = 1;
                        keyData = await walletService.generateTaprootKeysForIndex(seedPhrase, addressIndex);
                    }
                    script = Buffer.from(keyData.script, 'hex');

                    // Handle tweaked private key format (could be comma-separated string or hex)
                    let tweakedKeyBuffer;
                    if (typeof keyData.tweakedPrivateKey === 'string' && keyData.tweakedPrivateKey.includes(',')) {
                        // Convert comma-separated string to Buffer
                        const byteArray = keyData.tweakedPrivateKey.split(',').map(num => parseInt(num.trim()));
                        tweakedKeyBuffer = Buffer.from(byteArray);
                    } else {
                        // Assume hex string
                        tweakedKeyBuffer = Buffer.from(keyData.tweakedPrivateKey, 'hex');
                    }
                    signData[i] = { tweakedKey: tweakedKeyBuffer };
                } catch (error) {
                    throw new Error(`Could not prepare wallet UTXO for input ${i}: ${error.message}`);
                }
            }

            prevOutScripts.push(script);
            values.push(utxoValue);
        }

        // Generate signature hashes for all inputs
        const sighashes = [];
        for (let i = 0; i < spellTx.ins.length; i++) {
            const sighash = spellTx.hashForWitnessV1(
                i,
                prevOutScripts,
                values,
                bitcoin.Transaction.SIGHASH_DEFAULT
            );
            sighashes.push(sighash);
        }

        // Sign each transaction input
        for (let i = 0; i < spellTx.ins.length; i++) {
            const rawTxid = Buffer.from(spellTx.ins[i].hash).reverse().toString('hex');

            if (Object.prototype.hasOwnProperty.call(signData, i)) {
                // Handle tweaked private key - multiple formats possible
                let tweakedKey;
                const tweakedKeyRaw = signData[i].tweakedKey;
                
                if (typeof tweakedKeyRaw === 'string') {
                    if (tweakedKeyRaw.includes(',')) {
                        // Convert comma-separated string to Buffer: "197,97,250..." -> Buffer
                        const byteArray = tweakedKeyRaw.split(',').map(num => parseInt(num.trim()));
                        tweakedKey = Buffer.from(byteArray);
                    } else {
                        // Assume hex string
                        tweakedKey = Buffer.from(tweakedKeyRaw, 'hex');
                    }
                } else if (Buffer.isBuffer(tweakedKeyRaw)) {
                    tweakedKey = tweakedKeyRaw;
                } else if (tweakedKeyRaw instanceof Uint8Array) {
                    // Handle Uint8Array: Uint8Array(5) [34, 3, 23, 3, 51]
                    tweakedKey = Buffer.from(tweakedKeyRaw);
                } else if (tweakedKeyRaw && typeof tweakedKeyRaw === 'object' && tweakedKeyRaw.type === 'Buffer' && Array.isArray(tweakedKeyRaw.data)) {
                    // Handle serialized Buffer object: {"type":"Buffer","data":[34,3,23,3,51]}
                    tweakedKey = Buffer.from(tweakedKeyRaw.data);
                } else {
                    throw new Error(`Invalid tweakedPrivateKey format: ${typeof tweakedKeyRaw}, value: ${JSON.stringify(tweakedKeyRaw)}`);
                }


                // Validate private key format
                if (!tweakedKey || tweakedKey.length !== 32) {
                    throw new Error(`Invalid private key format. Expected 32 bytes, got ${tweakedKey ? tweakedKey.length : 'null'}. Raw value: ${JSON.stringify(tweakedKeyRaw)}`);
                }
                
                const signature = Buffer.from(ecc.signSchnorr(sighashes[i], tweakedKey));
                spellTx.ins[i].witness = [signature];
            } else if (rawTxid === commitTxId) {
                // Preserve existing witness data for commit tx input (already set from signed commit tx)
                // The witness should already be present from the signed commit transaction
            } else {
                throw new Error(`Unknown input UTXO: ${rawTxid}:${spellTx.ins[i].index}`);
            }
        }

        // Finalize and return signed transaction
        const signedTxHex = spellTx.toHex();
        const txidFinal = spellTx.getId();


        return { signedHex: signedTxHex, txid: txidFinal };
    } catch (error) {
        if (logCallback) {
            logCallback(`Error signing spell transaction: ${error.message}`);
        }
        throw error;
    }
}
