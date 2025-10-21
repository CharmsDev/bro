import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { WalletService } from '../wallet/WalletService.js';
import { generateTaprootKeysForIndex } from './txUtils.js';

// Initialize ECC library
bitcoin.initEccLib(ecc);

export async function signSpellTransaction(
    spellTxHex,
    signedCommitTxHex,
    miningTxHex = null,  // CRITICAL: Need mining tx hex for correct values
    logCallback = () => { }
) {
    try {
        if (!spellTxHex) throw new Error('Spell transaction hex is required');
        if (!signedCommitTxHex) throw new Error('Signed commit transaction hex is required');

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
        const preserveWitness = {}; // CRITICAL: Track which inputs preserve prover witness


        // Prepare signing data for each input
        for (let i = 0; i < spellTx.ins.length; i++) {
            const rawTxid = Buffer.from(spellTx.ins[i].hash).reverse().toString('hex');
            const vout = spellTx.ins[i].index;
            let utxoValue = null;
            let script = null;


            if (rawTxid === commitTxId) {
                // CRITICAL: Commit output uses prover's commitment script
                // We CANNOT sign this - we must preserve the witness from the prover
                const commitOutput = commitTx.outs[vout];
                script = commitOutput.script;
                utxoValue = commitOutput.value;
                preserveWitness[i] = true;
            } else {
                // This is a mining output - find address by script lookup
                try {
                    // CRITICAL: Use mining tx hex if provided (same as test)
                    if (!miningTxHex) {
                        throw new Error('Mining transaction hex is required for signing spell transaction');
                    }
                    
                    // Parse mining tx to get output data (same as test)
                    const miningTx = bitcoin.Transaction.fromHex(miningTxHex);
                    
                    const output = miningTx.outs[vout];
                    script = output.script;
                    utxoValue = output.value;
                    const targetScriptHex = script.toString('hex');
                    
                    let keys = null;
                    for (let testIndex = 0; testIndex < 10; testIndex++) {
                        const testKeys = await generateTaprootKeysForIndex(seedPhrase, testIndex);
                        if (testKeys.script === targetScriptHex) {
                            keys = testKeys;
                            break;
                        }
                    }
                    
                    if (!keys) {
                        throw new Error(`Could not find matching address for mining output ${rawTxid}:${vout}`);
                    }
                    
                    const tweakedKey = Buffer.isBuffer(keys.tweakedPrivateKey) 
                        ? keys.tweakedPrivateKey 
                        : Buffer.from(keys.tweakedPrivateKey);
                    
                    signData[i] = { tweakedKey };
                } catch (error) {
                    throw new Error(`Could not prepare mining UTXO for input ${i}: ${error.message}`);
                }
            }

            prevOutScripts.push(script);
            values.push(utxoValue);
        }

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

        for (let i = 0; i < spellTx.ins.length; i++) {
            if (preserveWitness[i]) {
                continue;
            } else if (Object.prototype.hasOwnProperty.call(signData, i)) {
                const tweakedKey = signData[i].tweakedKey;

                if (!Buffer.isBuffer(tweakedKey) || tweakedKey.length !== 32) {
                    throw new Error(`Invalid private key format. Expected 32-byte Buffer, got ${tweakedKey ? tweakedKey.length : 'null'} bytes`);
                }
                
                const signature = Buffer.from(ecc.signSchnorr(sighashes[i], tweakedKey));
                spellTx.ins[i].witness = [signature];
            } else {
                throw new Error(`Unknown input UTXO at index ${i}`);
            }
        }

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
