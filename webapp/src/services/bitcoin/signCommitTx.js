import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory } from 'bip32';
import * as bip39 from 'bip39';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { getUtxoValue } from './txUtils.js';

const ECPair = ECPairFactory(ecc);
const bip32 = BIP32Factory(ecc);

// Convert public key to x-only format for Taproot
function toXOnly(pubkey) {
    return pubkey.length === 33 ? Buffer.from(pubkey.slice(1, 33)) : pubkey;
}

// Extract transaction details from hex format
function parseUnsignedTx(txHex) {
    const tx = bitcoin.Transaction.fromHex(txHex);

    // Extract first input details
    const firstInput = tx.ins[0];
    const inputTxid = Buffer.from(firstInput.hash).reverse().toString('hex');
    const inputVout = firstInput.index;

    // Extract first output details
    const firstOutput = tx.outs[0];
    const outputAmount = firstOutput.value;

    return {
        version: tx.version,
        locktime: tx.locktime,
        utxoTxId: inputTxid,
        utxoVout: inputVout,
        utxoSequence: firstInput.sequence,
        outputAmount: outputAmount,
        outputScript: firstOutput.script
    };
}

// Get wallet data from localStorage
function getWalletData() {
    const stored = localStorage.getItem('charmsWallet');
    if (!stored) {
        throw new Error('Wallet not found in localStorage');
    }
    return JSON.parse(stored);
}

// Generate Taproot keys exactly like test-commit-signing.js
async function generateTaprootKeysForIndex(seedPhrase, index) {
    const bitcoin = window.bitcoin;
    const bip39 = window.bip39;
    const bip32 = window.bip32;
    const ecc = window.ecc;

    if (!bitcoin || !bip39 || !bip32 || !ecc) {
        throw new Error('Required libraries not available');
    }

    // Convert mnemonic to seed buffer
    const seed = await bip39.mnemonicToSeed(seedPhrase);

    // Generate BIP32 root key
    const root = bip32.fromSeed(seed, bitcoin.networks.testnet);

    // Use the same derivation path: m/86'/0'/0'/0/{index}
    const derivationPath = `m/86'/0'/0'/0/${index}`;
    const child = root.derivePath(derivationPath);
    const privateKey = child.privateKey;

    if (!privateKey) {
        throw new Error(`Could not derive private key for path: ${derivationPath}`);
    }

    // Apply Taproot tweaking exactly like test script
    const toXOnly = (pubkey) => pubkey.length === 33 ? Buffer.from(pubkey.slice(1, 33)) : pubkey;
    const internalPubkey = toXOnly(child.publicKey);

    // Calculate Taproot tweak hash
    const tweak = bitcoin.crypto.taggedHash('TapTweak', internalPubkey);

    // Apply tweak to private key
    const isOddY = child.publicKey[0] === 0x03;
    const tweakedPrivateKey = ecc.privateAdd(
        isOddY ? ecc.privateNegate(privateKey) : privateKey,
        tweak
    );

    if (!tweakedPrivateKey) {
        throw new Error('Tweak resulted in invalid private key');
    }

    // Create P2TR payment object
    const p2tr = bitcoin.payments.p2tr({
        internalPubkey,
        network: bitcoin.networks.testnet
    });

    return {
        privateKey,
        tweakedPrivateKey,
        internalPubkey,
        p2tr,
        address: p2tr.address,
        derivationPath
    };
}

// Get wallet seed phrase from localStorage
function getWalletSeedPhrase() {
    const walletData = getWalletData();
    return walletData.seedPhrase;
}

// Find which address index owns a specific UTXO
function findAddressIndexForUTXO(utxoScript) {
    const walletData = getWalletData();
    if (!walletData || !walletData.addresses) {
        throw new Error('Wallet data not found or missing addresses');
    }

    // Convert UTXO script to hex string for comparison
    const utxoScriptHex = typeof utxoScript === 'string' ? utxoScript : utxoScript.toString('hex');

    for (const addressData of walletData.addresses) {
        if (addressData.script === utxoScriptHex) {
            return addressData.index;
        }
    }

    // Fallback: use index 0 (primary address) if no match found
    return 0;
}

// Signs a Bitcoin Taproot (P2TR) commit transaction
export async function signCommitTransaction(unsignedTxHex, logCallback) {
    const log = logCallback || (() => { });

    try {
        // Parse unsigned transaction to extract UTXO details
        const txDetails = parseUnsignedTx(unsignedTxHex);

        // Get wallet seed phrase
        const seedPhrase = getWalletSeedPhrase();

        // Generate keys for INDEX 1 exactly like test script
        const keys = await generateTaprootKeysForIndex(seedPhrase, 1);

        // Get UTXO value for signing
        const utxoValue = await getUtxoValue(txDetails.utxoTxId, txDetails.utxoVout);

        // Create transaction for signing
        const tx = bitcoin.Transaction.fromHex(unsignedTxHex);

        // Calculate sighash for Taproot key-path spending
        const sighash = tx.hashForWitnessV1(
            0, // input index
            [keys.p2tr.output], // prevout scripts
            [utxoValue], // prevout values
            bitcoin.Transaction.SIGHASH_DEFAULT
        );

        // Sign with tweaked private key
        const signature = Buffer.from(ecc.signSchnorr(sighash, keys.tweakedPrivateKey));

        // Add witness to transaction
        tx.ins[0].witness = [signature];

        const signedTxHex = tx.toHex();
        const txid = tx.getId();

        return {
            signedHex: signedTxHex,
            txid: txid
        };

    } catch (error) {
        throw error;
    }
}
