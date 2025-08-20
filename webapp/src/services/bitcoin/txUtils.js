import * as bitcoin from 'bitcoinjs-lib';

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
        // Fetching UTXO from QuickNode

        // Hardcoded QuickNode credentials (bypass env variable issues)
        const quickNodeUrl = 'https://holy-proud-lambo.btc-testnet4.quiknode.pro/cb3fefdb3473023b292894cd92ca9bd732ec9798/';
        const quickNodeApiKey = 'cb3fefdb3473023b292894cd92ca9bd732ec9798';

        if (!quickNodeUrl) {
            throw new Error('QuickNode URL not configured');
        }

        // QuickNode Bitcoin RPC call to get transaction data
        const rpcPayload = {
            jsonrpc: "2.0",
            id: 1,
            method: "getrawtransaction",
            params: [txid, true] // true for verbose output (decoded transaction)
        };

        console.log(`🔍 Calling QuickNode API...`);
        const response = await fetch(quickNodeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(quickNodeApiKey && { 'Authorization': `Bearer ${quickNodeApiKey}` })
            },
            body: JSON.stringify(rpcPayload)
        });

        if (!response.ok) {
            throw new Error(`QuickNode API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(`QuickNode RPC error: ${data.error.message}`);
        }

        if (!data.result || !data.result.vout || !data.result.vout[vout]) {
            throw new Error(`Output ${vout} not found in transaction ${txid}`);
        }

        // Extract value from QuickNode response (in BTC, convert to satoshis)
        const valueInBtc = data.result.vout[vout].value;
        const valueInSatoshis = Math.round(valueInBtc * 100000000);

        // UTXO value retrieved
        return valueInSatoshis;

    } catch (error) {
        console.error(`❌ Failed to fetch UTXO ${txid}:${vout}:`, error.message);
        throw error;
    }
}
