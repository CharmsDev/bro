import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory } from 'bip32';
import * as bip39 from 'bip39';
import * as ecc from 'tiny-secp256k1';
import { WalletService } from '../wallet-service.js';
import { getUtxoValue } from './txUtils.js';

// Initialize ECC library for bitcoinjs-lib
bitcoin.initEccLib(ecc);
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

// Extract UTXO value from mining transaction hex (exact copy from test script)
function getUtxoValueFromTxHex(miningTxHex, vout) {
    const tx = bitcoin.Transaction.fromHex(miningTxHex);
    if (vout >= tx.outs.length) {
        throw new Error(`VOUT ${vout} not found in transaction (has ${tx.outs.length} outputs)`);
    }
    return tx.outs[vout].value;
}

// Generate Taproot keys for specific index (exact copy from test script)
async function generateTaprootKeysForIndex(seedPhrase, index) {
    const seed = await bip39.mnemonicToSeed(seedPhrase);
    
    // Get network from WalletService but use same logic as test script
    const walletService = new WalletService();
    const isTestnet = walletService.network.includes('testnet');
    const bitcoinNetwork = isTestnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
    const root = bip32.fromSeed(seed, bitcoinNetwork);

    // Network-aware derivation path (testnet uses coin type 1', mainnet uses 0')
    const coinType = isTestnet ? "1'" : "0'";
    const derivationPath = `m/86'/${coinType}/0'/0/${index}`;
    const child = root.derivePath(derivationPath);
    const privateKey = child.privateKey;

    if (!privateKey) throw new Error(`Could not derive private key for index ${index}`);

    // Apply Taproot tweaking (exact copy from test script)
    const internalPubkey = toXOnly(child.publicKey);
    const tweak = bitcoin.crypto.taggedHash('TapTweak', internalPubkey);

    const isOddY = child.publicKey[0] === 0x03;
    const tweakedPrivateKey = ecc.privateAdd(
        isOddY ? ecc.privateNegate(privateKey) : privateKey,
        tweak
    );
    if (!tweakedPrivateKey) throw new Error('Tweak resulted in invalid private key');

    // Create P2TR payment object
    const p2tr = bitcoin.payments.p2tr({
        internalPubkey,
        network: bitcoinNetwork
    });

    return {
        index,
        derivationPath,
        privateKey,
        tweakedPrivateKey,
        internalPubkey,
        p2tr,
        address: p2tr.address,
        script: p2tr.output.toString('hex')
    };
}

// Find the correct address index by matching the UTXO output script
async function findAddressIndexFromMiningTx(miningTxHex, utxoVout, seedPhrase) {
    // Parse mining transaction to get the output script
    const miningTx = bitcoin.Transaction.fromHex(miningTxHex);
    const targetOutput = miningTx.outs[utxoVout];
    const targetScriptHex = targetOutput.script.toString('hex');
    
    // Get wallet service to determine network
    const walletService = new WalletService();
    const isTestnet = walletService.network.includes('testnet');
    
    // Try different address indices to find the one that matches
    for (let index = 0; index < 100; index++) {
        const keys = await generateTaprootKeysForIndex(seedPhrase, index);
        if (keys.script === targetScriptHex) {
            return index;
        }
    }
    
    throw new Error(`Could not find address index for UTXO output script: ${targetScriptHex}`);
}

// Signs a Bitcoin Taproot (P2TR) commit transaction
export async function signCommitTransaction(unsignedTxHex, miningTxHex) {
    try {
        // Get wallet seed phrase
        const walletService = new WalletService();
        const seedPhrase = walletService.getSeedPhrase();
        if (!seedPhrase) throw new Error('Seed phrase not found in wallet');

        // Parse the unsigned transaction to get input details
        const tx = bitcoin.Transaction.fromHex(unsignedTxHex);
        const input = tx.ins[0];
        const inputTxid = Buffer.from(input.hash).reverse().toString('hex');
        const inputVout = input.index;

        // Validate mining transaction hex is provided
        if (!miningTxHex) {
            throw new Error('Mining transaction hex is required for signing');
        }

        // Get UTXO value from mining transaction
        const utxoValue = getUtxoValueFromTxHex(miningTxHex, inputVout);

        // Find the correct address index by matching the UTXO output script
        const correctIndex = await findAddressIndexFromMiningTx(miningTxHex, inputVout, seedPhrase);

        // Generate keys for the correct index
        const keys = await generateTaprootKeysForIndex(seedPhrase, correctIndex);

        // Prepare transaction for signing
        const signTx = bitcoin.Transaction.fromHex(unsignedTxHex);
        signTx.version = 2; // Set version 2 for Taproot compatibility

        // Generate signature hash
        const sighash = signTx.hashForWitnessV1(
            0,                  // Input index
            [keys.p2tr.output], // Previous output script
            [utxoValue],        // Previous output value
            bitcoin.Transaction.SIGHASH_DEFAULT  // Sighash type (0)
        );

        // Create Schnorr signature
        const sig = ecc.signSchnorr(sighash, keys.tweakedPrivateKey);
        const signature = Buffer.from(sig);

        // Attach signature as witness data
        signTx.ins[0].witness = [signature];

        const signedTxHex = signTx.toHex();
        const txid = signTx.getId();


        return {
            success: true,
            txid: txid,
            signedHex: signedTxHex
        };

    } catch (error) {
        console.error('❌ Error signing commit transaction:', error);
        throw error;
    }
}
