#!/usr/bin/env node

import { readFileSync } from 'fs';
import fetch from 'node-fetch';

// API endpoint
const API_URL = 'https://charms-prover-test.fly.dev/spells/prove';

// Path to the payload file
const PAYLOAD_FILE = '/Users/ricartjuncadella/Documents/Prj/bitcoinos/charms-bro/tests/payloads/request.json';

async function testProverAPI() {
    console.log('=== TESTING PROVER API ===');
    console.log('API URL:', API_URL);
    console.log('Payload file:', PAYLOAD_FILE);
    console.log('');

    try {
        // Load the payload from file
        console.log('📁 Loading payload from file...');
        const payloadData = JSON.parse(readFileSync(PAYLOAD_FILE, 'utf8'));
        console.log('✅ Payload loaded successfully');
        console.log('Payload size:', JSON.stringify(payloadData).length, 'bytes');
        console.log('');

        // Display key payload info
        console.log('📊 PAYLOAD INFO:');
        console.log('- Spell version:', payloadData.spell.version);
        console.log('- Apps:', Object.keys(payloadData.spell.apps));
        console.log('- Transaction ID:', payloadData.spell.private_inputs.$01.tx.substring(0, 20) + '...');
        console.log('- Proof length:', payloadData.spell.private_inputs.$01.tx_block_proof.length, 'chars');
        console.log('- UTXO ID:', payloadData.spell.ins[0].utxo_id);
        console.log('- Output address:', payloadData.spell.outs[0].address);
        console.log('- Token amount:', payloadData.spell.outs[0].charms.$01);
        console.log('');

        // Make the API call
        console.log('🚀 Making API call...');
        const startTime = Date.now();

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payloadData)
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log('⏱️  Response time:', duration, 'ms');
        console.log('📡 Response status:', response.status, response.statusText);
        console.log('📋 Response headers:');
        for (const [key, value] of response.headers) {
            console.log(`   ${key}: ${value}`);
        }
        console.log('');

        // Get response body
        const responseText = await response.text();
        console.log('📄 Response body length:', responseText.length, 'bytes');

        if (response.ok) {
            console.log('✅ API CALL SUCCESSFUL!');

            try {
                const responseData = JSON.parse(responseText);
                console.log('📊 RESPONSE DATA:');
                console.log(JSON.stringify(responseData, null, 2));
            } catch (e) {
                console.log('📄 Raw response (not JSON):');
                console.log(responseText);
            }
        } else {
            console.log('❌ API CALL FAILED!');
            console.log('Error response:');
            console.log(responseText);
        }

    } catch (error) {
        console.error('💥 ERROR:', error.message);
        if (error.code) {
            console.error('Error code:', error.code);
        }
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }

    console.log('');
    console.log('=== TEST COMPLETED ===');
}

// Generate curl command for comparison
function generateCurlCommand() {
    console.log('');
    console.log('=== EQUIVALENT CURL COMMAND ===');
    console.log(`curl -X POST "${API_URL}" \\`);
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -H "Accept: application/json" \\');
    console.log(`  -d @"${PAYLOAD_FILE}" \\`);
    console.log('  -w "\\n\\nResponse time: %{time_total}s\\nStatus: %{http_code}\\n"');
    console.log('');
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    testProverAPI().then(() => {
        generateCurlCommand();
    });
}

export { testProverAPI };
