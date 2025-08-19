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

        logCallback('Starting spell transaction signing...');

        // Use bitcoinjs-lib for transaction parsing and signing (dynamic import to avoid init issues)
        const bitcoin = await import('bitcoinjs-lib');
        const { BIP32Factory } = await import('bip32');
        const bip39 = await import('bip39');
        const ecc = await import('tiny-secp256k1');
        const { ECPairFactory } = await import('ecpair');

        const ECPair = ECPairFactory(ecc);
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

        // Get seed phrase from localStorage
        const stored = localStorage.getItem('charmsWallet');
        if (!stored) {
            throw new Error('No wallet found in localStorage');
        }

        const walletData = JSON.parse(stored);
        const seedPhrase = walletData.seedPhrase;
        if (!seedPhrase) throw new Error('Seed phrase not found');

        // Generate BIP32 root key from seed phrase
        const seed = await bip39.mnemonicToSeed(seedPhrase);
        const root = bip32.fromSeed(seed, bitcoin.networks.testnet);

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

                    // Generate keys for index 1 (consistent with commit signing)
                    const derivationPath = "m/86'/0'/0'/0/1";
                    const child = root.derivePath(derivationPath);
                    let privKey = child.privateKey;
                    if (!privKey) throw new Error(`Could not derive private key for ${derivationPath}`);
                    if (!Buffer.isBuffer(privKey)) privKey = Buffer.from(privKey);

                    const internalPubkey = toXOnly(child.publicKey);
                    const p2tr = bitcoin.payments.p2tr({
                        internalPubkey,
                        network: bitcoin.networks.testnet
                    });
                    script = p2tr.output;

                    // Apply Taproot tweaking to private key
                    const tweak = bitcoin.crypto.taggedHash('TapTweak', internalPubkey);
                    const isOddY = child.publicKey[0] === 0x03;
                    let keyForTweak = privKey;
                    if (isOddY) {
                        const neg = ecc.privateNegate(privKey);
                        if (!neg) throw new Error('Failed to negate private key');
                        keyForTweak = neg;
                    }
                    const tweakedKey = ecc.privateAdd(keyForTweak, tweak);
                    if (!tweakedKey) throw new Error('Tweak resulted in invalid private key');

                    signData[i] = { tweakedKey };
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
                // Sign wallet-owned input with tweaked key
                const signature = Buffer.from(ecc.signSchnorr(sighashes[i], signData[i].tweakedKey));
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

        if (logCallback) {
            logCallback(`Spell transaction signed successfully: TXID ${txidFinal}`);
        }

        return { signedHex: signedTxHex, txid: txidFinal };
    } catch (error) {
        if (logCallback) {
            logCallback(`Error signing spell transaction: ${error.message}`);
        }
        throw error;
    }
}
