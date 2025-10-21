import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory } from 'bip32';
import * as bip39 from 'bip39';
import * as ecc from 'tiny-secp256k1';
import { WalletService } from '../wallet/WalletService.js';
import { getUtxoValue } from './txUtils.js';
import { environmentConfig } from '../../config/environment.js';

bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);

function toXOnly(pubkey) {
    return pubkey.length === 33 ? Buffer.from(pubkey.slice(1, 33)) : pubkey;
}

function parseUnsignedTx(txHex) {
    const tx = bitcoin.Transaction.fromHex(txHex);

    const firstInput = tx.ins[0];
    const inputTxid = Buffer.from(firstInput.hash).reverse().toString('hex');
    const inputVout = firstInput.index;

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

function getWalletData() {
    const CentralStorage = require('../../storage/CentralStorage.js').default;
    const walletData = CentralStorage.getWallet();
    
    if (!walletData) {
        throw new Error('Wallet not found in CentralStorage');
    }
    
    const { WalletStorage } = require('../wallet/WalletStorage.js');
    const extendedAddresses = WalletStorage.loadExtendedAddresses();
    
    return {
        ...walletData,
        addresses: extendedAddresses?.recipient || []
    };
}

function getUtxoValueFromTxHex(miningTxHex, vout) {
    const tx = bitcoin.Transaction.fromHex(miningTxHex);
    if (vout >= tx.outs.length) {
        throw new Error(`VOUT ${vout} not found in transaction (has ${tx.outs.length} outputs)`);
    }
    return tx.outs[vout].value;
}

async function generateTaprootKeysForIndex(seedPhrase, index) {
    const seed = await bip39.mnemonicToSeed(seedPhrase);
    
    const isTestnet = environmentConfig.isTestnet();
    const bitcoinNetwork = isTestnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
    const root = bip32.fromSeed(seed, bitcoinNetwork);

    const coinType = isTestnet ? "1'" : "0'";
    const derivationPath = `m/86'/${coinType}/0'/0/${index}`;
    const child = root.derivePath(derivationPath);
    const privateKey = child.privateKey;

    if (!privateKey) throw new Error(`Could not derive private key for index ${index}`);

    const internalPubkey = toXOnly(child.publicKey);
    const tweak = bitcoin.crypto.taggedHash('TapTweak', internalPubkey);

    const isOddY = child.publicKey[0] === 0x03;
    const tweakedPrivateKey = ecc.privateAdd(
        isOddY ? ecc.privateNegate(privateKey) : privateKey,
        tweak
    );
    if (!tweakedPrivateKey) throw new Error('Tweak resulted in invalid private key');

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

async function findAddressIndexFromMiningTx(miningTxHex, utxoVout, seedPhrase) {
    const miningTx = bitcoin.Transaction.fromHex(miningTxHex);
    const targetOutput = miningTx.outs[utxoVout];
    const targetScriptHex = targetOutput.script.toString('hex');
    
    const isTestnet = environmentConfig.isTestnet();
    for (let index = 0; index < 100; index++) {
        const keys = await generateTaprootKeysForIndex(seedPhrase, index);
        if (keys.script === targetScriptHex) {
            return index;
        }
    }
    
    throw new Error(`Could not find address index for UTXO output script: ${targetScriptHex}`);
}

export async function signCommitTx(unsignedTxHex, miningTxHex) {
    try {
        const walletService = new WalletService();
        const seedPhrase = walletService.getSeedPhrase();
        if (!seedPhrase) throw new Error('Seed phrase not found in wallet');

        const tx = bitcoin.Transaction.fromHex(unsignedTxHex);
        const input = tx.ins[0];
        const inputVout = input.index;

        if (!miningTxHex) {
            throw new Error('Mining transaction hex is required for signing');
        }

        const utxoValue = getUtxoValueFromTxHex(miningTxHex, inputVout);
        const correctIndex = await findAddressIndexFromMiningTx(miningTxHex, inputVout, seedPhrase);
        const keys = await generateTaprootKeysForIndex(seedPhrase, correctIndex);

        const signTx = bitcoin.Transaction.fromHex(unsignedTxHex);
        signTx.version = 2;
        const sighash = signTx.hashForWitnessV1(
            0,
            [keys.p2tr.output],
            [utxoValue],
            bitcoin.Transaction.SIGHASH_DEFAULT
        );

        const sig = ecc.signSchnorr(sighash, keys.tweakedPrivateKey);
        const signature = Buffer.from(sig);

        signTx.ins[0].witness = [signature];

        const signedTxHex = signTx.toHex();
        const txid = signTx.getId();

        return {
            success: true,
            txid: txid,
            signedHex: signedTxHex
        };

    } catch (error) {
        throw error;
    }
}
