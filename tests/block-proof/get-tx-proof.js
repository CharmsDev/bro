#!/usr/bin/env node

// Script to get transaction proof once Bitcoin Core is ready
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TXID = '282c18027588febca2b0f037a02f70c4a9b175a464dd460b745dc94be7ceaaa8';
const BLOCK_HASH = '0000000000000001e6b49035507847ec0bbd3ba7634697725ae4b31bcac7fd2b';

async function getTxProof() {
    try {
        console.log('=== GETTING TRANSACTION PROOF ===');
        console.log('TXID:', TXID);
        console.log('Block Hash:', BLOCK_HASH);
        console.log('');

        // First check if Bitcoin Core is ready
        console.log('Checking Bitcoin Core status...');
        try {
            const { stdout: info } = await execAsync('bitcoin-cli getblockchaininfo');
            const blockchainInfo = JSON.parse(info);
            console.log('Current block height:', blockchainInfo.blocks);
            console.log('Verification progress:', (blockchainInfo.verificationprogress * 100).toFixed(2) + '%');

            if (blockchainInfo.verificationprogress < 1.0) {
                console.log('⚠️  Bitcoin Core is still syncing. Please wait...');
                return;
            }
        } catch (error) {
            console.error('❌ Bitcoin Core not ready:', error.message);
            return;
        }

        // Get the transaction proof
        console.log('\nGetting transaction proof...');
        const command = `bitcoin-cli gettxoutproof '["${TXID}"]' ${BLOCK_HASH}`;
        console.log('Command:', command);

        const { stdout: proof } = await execAsync(command);

        console.log('\n✅ Transaction proof obtained:');
        console.log('---');
        console.log(proof.trim());
        console.log('---');

        console.log('\n📋 Copy this proof and replace "PENDING_BITCOIN_CORE_RESCAN" in request.js');

        return proof.trim();

    } catch (error) {
        console.error('❌ Error getting transaction proof:', error.message);

        if (error.message.includes('Rescanning')) {
            console.log('⏳ Bitcoin Core is still rescanning. Please wait and try again.');
        } else if (error.message.includes('Could not connect')) {
            console.log('🔌 Bitcoin Core is not running. Start it with: bitcoind -daemon');
        }
    }
}

// Run the script
getTxProof();
