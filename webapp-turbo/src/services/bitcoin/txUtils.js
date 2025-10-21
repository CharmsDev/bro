import * as bitcoin from 'bitcoinjs-lib';
import { environmentConfig } from '../../config/environment.js';
import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import BitcoinApiRouter from '../providers/bitcoin-api-router/index.js';

// Initialize
const bip32 = BIP32Factory(ecc);

// Helper: Convert public key to x-only format for Taproot
function toXOnly(pubkey) {
  return pubkey.length === 33 ? Buffer.from(pubkey.slice(1, 33)) : pubkey;
}

/**
 * Generate Taproot keys for specific index
 * COPIED EXACTLY FROM TEST - DO NOT MODIFY
 */
export async function generateTaprootKeysForIndex(seedPhrase, index) {
  const seed = await bip39.mnemonicToSeed(seedPhrase);
  const network = bitcoin.networks.bitcoin; // mainnet
  const root = bip32.fromSeed(seed, network);
  
  // Derivation path: m/86'/0'/0'/0/{index}
  const derivationPath = `m/86'/0'/0'/0/${index}`;
  const child = root.derivePath(derivationPath);
  const privateKey = child.privateKey;
  
  if (!privateKey) throw new Error(`Could not derive private key for index ${index}`);
  
  // Apply Taproot tweaking
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
    network
  });
  
  return {
    index,
    derivationPath,
    privateKey,
    tweakedPrivateKey, // Returns Buffer directly
    internalPubkey,
    p2tr,
    address: p2tr.address,
    script: p2tr.output.toString('hex')
  };
}

// Decode Bitcoin script to determine type
export function decodeScript(script) {
    try {
        if (script.length === 34 && script[0] === 0x51 && script[1] === 0x20) {
            const pubkey = script.slice(2).toString('hex');
            return {
                type: 'P2TR',
                internalKey: pubkey
            };
        }
        return {
            type: 'Unknown'
        };
    } catch (error) {
        return {
            type: 'Error'
        };
    }
}

// Extract transaction details from hex format
export function parseUnsignedTx(txHex) {
    const tx = bitcoin.Transaction.fromHex(txHex);

    // Extract input data
    const inputs = tx.ins.map((input, index) => {
        const txid = Buffer.from(input.hash).reverse().toString('hex');
        const vout = input.index;
        const sequence = input.sequence;
        return {
            index,
            txid,
            vout,
            sequence
        };
    });

    // Extract output data
    const outputs = tx.outs.map((output, index) => {
        const value = output.value;
        const script = output.script;
        const scriptDecoded = decodeScript(script);
        return {
            index,
            value,
            script: script.toString('hex'),
            scriptDecoded
        };
    });

    return {
        version: tx.version,
        locktime: tx.locktime,
        utxoTxId: inputs[0].txid,
        utxoVout: inputs[0].vout,
        utxoSequence: inputs[0].sequence,
        outputAmount: outputs[0].value,
        outputScript: tx.outs[0].script,
        outputScriptHex: outputs[0].script,
        outputInternalKey: outputs[0].scriptDecoded.type === 'P2TR' ? outputs[0].scriptDecoded.internalKey : null
    };
}

// Extract UTXO value from a transaction hex by decoding it
export function getUtxoValueFromTxHex(txHex, vout) {
    try {
        const tx = bitcoin.Transaction.fromHex(txHex);

        if (!tx.outs || !tx.outs[vout]) {
            throw new Error(`Output ${vout} not found in transaction`);
        }

        const outputValue = tx.outs[vout].value;
        return outputValue;

    } catch (error) {
        throw error;
    }
}

// Get UTXO value using QuickNode Bitcoin API - strict mode, no fallbacks
export async function getUtxoValue(txid, vout) {
    try {
        const client = new BitcoinApiRouter();
        const txData = await client.getRawTransaction(txid, true);

        if (!txData || !txData.vout || !txData.vout[vout]) {
            throw new Error(`Output ${vout} not found in transaction ${txid}`);
        }

        const valueInBtc = txData.vout[vout].value;
        const valueInSatoshis = Math.round(valueInBtc * 100000000);
        return valueInSatoshis;

    } catch (error) {
        throw error;
    }
}
