import fetch from 'node-fetch';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';


// Temp API endpoint (RJJv)
const apiUrl = 'https://charms-prover-test.fly.dev/spells/prove';

// Transaction data from mining transaction (RJJv)
const miningTxid = '282c18027588febca2b0f037a02f70c4a9b175a464dd460b745dc94be7ceaaa8';
const miningTxHex = '020000000001014cff92e4f350463d29475b6143b987b5e32902f78806f2a5efc72d98ded9dc4c0000000000ffffffff030000000000000000076a0539303737330903000000000000225120a82f29944d65b86ae6b5e5cc75e294ead6c59391a1edc5e016e3498c67fc7bbb2f9a070000000000225120a82f29944d65b86ae6b5e5cc75e294ead6c59391a1edc5e016e3498c67fc7bbb01404ec23be6516c36b36658e28bebf89829b0d7dd7909d84b958e5d6c1516d35fd5c7d7e13dbd7e730b0938e4e59482f13e1cb99cb917ff829d914216a80a6cfc8300000000';

// Generate app_id from the input UTXO (getting from README)
// :0 data (OP_RETURN) | :1 777 sats | :2 change (for funcding)
const inputUtxo = '4cff92e4f350463d29475b6143b987b5e32902f78806f2a5efc72d98ded9dc4c:1';
const appId = createHash('sha256').update(inputUtxo).digest('hex');

// Read WASM binary file and encode as base64
const wasmPath = '../wasm/bro-token.wasm';
const wasmBinary = readFileSync(wasmPath);
const wasmBase64 = wasmBinary.toString('base64');

// WASM binary hash (calculated previously)
const wasmHash = '6c730a8c2525445acd8efecb8dae6549dc64ce78ef3c50631ee0dad9ab8f7618';

// App verification key (RJJv | bitcoin-cli generated)
const appVk = '6c730a8c2525445acd8efecb8dae6549dc64ce78ef3c50631ee0dad9ab8f7618';

// Output address from the transaction
const outputAddress = 'tb1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqp3mvzv';

// Mined amount (bro tokens in smallest unit - equivalent to satoshis)
const minedAmount = 11250000000; // 112.5 * 100,000,000

// Request payload based on mint-token.yaml spell
const payload = {
    "spell": {
        "version": 6,
        "apps": {
            "$01": `t/${appId}/${appVk}`
        },
        "private_inputs": {
            "$01": {
                "tx": miningTxHex,
                "tx_block_proof": "004014212de3ff3812985e30078bbf148e99eeaf9c74704243a54f5f31c58608000000006d42362098d1482a441ecc786f57572580e588ca15951942ffbfa1100da20c371f7d9868781c03194d42b3aa0b0400000cbe5262a4cc662c57156c73cbeafbae041577174fc9f34a52b88555e0ac82d924b36dcf9f5b6167a0eebb5eddb95334f31770fa1f72e0b102e5dc97998fcfe0402bbbba4a477c09bf381440b95bb47e57542f0a92285e3709a1ba453628ab7914dc159b96a9185e5bb04ffa1c8e02fd890221b86f523a791602df7e1a17746092a8aacee74bc95d740b46dd64a475b1a9c4702fa037f0b0a2bcfe887502182c28b742d03a80c5d0a3319d6a856e965bc2953b30c419f6f4b9d0bcbb9c25a19b88881aacf61e80b92485c06c1dca8d22801a542abcbca7de0baa26d803c42154ea0a61a98893619ebd07a7ddb3abd86a18889c8cde4ad2da1af06151445ee13fbf06945774e39829ee211d3cecbba465d25d6b2431ea5a7f0ca48927d879b46222e79d8ebe323ede01f056b7a7b8c7fc4a2baa4b078d81b57a0222696768eb7fa8fa3637b411fd39de3f0959634e6886e604bc53f5091238c0a0047cf96d8c924522eb765eee844a4e1585ec6b2c43320fe32803c7ed0e3f75b6ed501dc9cb3797035fdd00"
            }
        },
        "ins": [
            {
                "utxo_id": `${miningTxid}:1`, // Output 1 (777 sats)
                "charms": {}
            }
        ],
        "outs": [
            {
                "address": outputAddress,
                "charms": {
                    "$01": minedAmount
                }
            }
        ]
    },
    "binaries": {
        [wasmHash]: wasmBase64
    },
    "prev_txs": [
        miningTxHex
    ],
    "funding_utxo": `${miningTxid}:2`, // Output 2 (RJJv | 498223 sats for funding)
    "funding_utxo_value": 498223,
    "change_address": outputAddress,
    "fee_rate": 1.0,
    "chain": "bitcoin"
};

// Validate payload JSON structure and content
function validatePayload(payload) {
    console.log('=== PAYLOAD VALIDATION ===');

    try {
        // Test JSON serialization
        const jsonString = JSON.stringify(payload);
        console.log('✓ JSON serialization successful');

        // Test JSON parsing
        const parsedPayload = JSON.parse(jsonString);
        console.log('✓ JSON parsing successful');

        // Validate required fields
        const requiredFields = [
            'spell',
            'binaries',
            'prev_txs',
            'funding_utxo',
            'funding_utxo_value',
            'change_address',
            'fee_rate',
            'chain'
        ];

        for (const field of requiredFields) {
            if (!parsedPayload.hasOwnProperty(field)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        console.log('✓ All required fields present');

        // Validate spell structure
        if (!parsedPayload.spell.version) {
            throw new Error('Missing spell.version');
        }
        if (!parsedPayload.spell.apps || Object.keys(parsedPayload.spell.apps).length === 0) {
            throw new Error('Missing or empty spell.apps');
        }
        if (!parsedPayload.spell.ins || parsedPayload.spell.ins.length === 0) {
            throw new Error('Missing or empty spell.ins');
        }
        if (!parsedPayload.spell.outs || parsedPayload.spell.outs.length === 0) {
            throw new Error('Missing or empty spell.outs');
        }
        console.log('✓ Spell structure valid');

        // Validate data types
        if (typeof parsedPayload.spell.version !== 'number') {
            throw new Error('spell.version must be a number');
        }
        if (typeof parsedPayload.funding_utxo_value !== 'number') {
            throw new Error('funding_utxo_value must be a number');
        }
        if (typeof parsedPayload.fee_rate !== 'number') {
            throw new Error('fee_rate must be a number');
        }
        console.log('✓ Data types valid');

        // Validate WASM binary presence and size
        const wasmHashes = Object.keys(parsedPayload.binaries);
        if (wasmHashes.length === 0) {
            throw new Error('No WASM binaries found in payload');
        }

        for (const hash of wasmHashes) {
            const wasmBinary = parsedPayload.binaries[hash];
            if (!wasmBinary || wasmBinary.length === 0) {
                throw new Error(`Empty WASM binary for hash: ${hash}`);
            }
            console.log(`✓ WASM binary found for hash: ${hash}`);
            console.log(`  - Base64 length: ${wasmBinary.length} characters`);
            console.log(`  - Estimated binary size: ~${Math.round(wasmBinary.length * 0.75 / 1024)} KB`);
        }

        // Calculate total payload size
        const totalPayloadSize = jsonString.length;
        console.log(`✓ Total payload size: ${totalPayloadSize} characters (~${Math.round(totalPayloadSize / 1024)} KB)`);

        console.log('✓ Payload validation PASSED');
        console.log('');
        return { valid: true, payload: parsedPayload };

    } catch (error) {
        console.error('✗ Payload validation FAILED:', error.message);
        console.log('');
        return { valid: false, error: error.message };
    }
}

// Make the POST request
async function makeRequest() {
    try {
        console.log('=== API REQUEST ===');
        console.log('Sending payload to API...');

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('Response Status:', response.status);

        const rawText = await response.text();
        console.log('Raw Response:', rawText);

        // Try to parse as JSON if possible
        let data;
        try {
            data = JSON.parse(rawText);
            console.log('Parsed JSON Response:', JSON.stringify(data, null, 2));
        } catch (jsonError) {
            console.error('Error parsing JSON:', jsonError.message);
            console.log('Using raw text as response');
            data = rawText;
        }

        return data;
    } catch (error) {
        console.error('Error making request:', error);
    }
}

// Execute the request with validation
async function executeWithValidation() {
    console.log('=== CONFIG PARAMETERS ===');
    console.log('Prover URL:', apiUrl);
    console.log('Chain:', payload.chain);
    console.log('Fee rate:', payload.fee_rate);
    console.log('');

    console.log('=== INPUT PARAMETERS ===');
    console.log('Mining TXID:', miningTxid);
    console.log('Generated app_id:', appId);
    console.log('WASM hash:', wasmHash);
    console.log('Input UTXO:', inputUtxo);
    console.log('Funding UTXO:', payload.funding_utxo);
    console.log('Funding UTXO value:', payload.funding_utxo_value);
    console.log('Output address:', outputAddress);
    console.log('Change address:', payload.change_address);
    console.log('Mined amount:', minedAmount);
    console.log('');

    // Validate the payload
    const validation = validatePayload(payload);

    if (!validation.valid) {
        console.error('Cannot proceed with API request due to validation errors');
        return;
    }

    // Print the payload instead of making the request
    console.log('=== GENERATED PAYLOAD ===');
    console.log(JSON.stringify(payload, null, 2));
}

executeWithValidation();
