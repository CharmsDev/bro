import * as bitcoin from 'bitcoinjs-lib';
import { environmentConfig } from '../../config/environment.js';
import BitcoinApiRouter from '../providers/bitcoin-api-router.js';

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
        console.error('Error extracting UTXO value from transaction hex:', error);
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
