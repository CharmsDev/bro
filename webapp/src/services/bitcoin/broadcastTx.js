import config from '@/config';

// Broadcasts Bitcoin transactions using QuickNode API
export async function broadcastTransactions(signedCommitTx, signedSpellTx, logCallback = () => { }) {
    try {
        if (!signedCommitTx || !signedSpellTx) {
            throw new Error('Please sign the transactions first');
        }

        const quicknodeUrl = process.env.NEXT_PUBLIC_QUICKNODE_BITCOIN_TESTNET_URL;
        const apiKey = process.env.NEXT_PUBLIC_QUICKNODE_API_KEY;

        if (!quicknodeUrl || !apiKey) {
            throw new Error('QuickNode API credentials not configured');
        }

        logCallback('Starting transaction broadcast process...');
        logCallback('Broadcasting commit transaction...');

        // Broadcast commit transaction first
        const commitResponse = await fetch(quicknodeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'sendrawtransaction',
                params: [signedCommitTx.signedHex]
            })
        });

        if (!commitResponse.ok) {
            throw new Error(`Commit broadcast failed: ${commitResponse.status}`);
        }

        const commitResult = await commitResponse.json();

        if (commitResult.error) {
            throw new Error(`Commit broadcast error: ${commitResult.error.message}`);
        }

        const commitTxid = commitResult.result;

        logCallback(`Commit transaction broadcast successful!`);
        logCallback(`Commit transaction ID: ${commitTxid}`);

        logCallback('Broadcasting spell transaction...');

        // Broadcast spell transaction
        const spellResponse = await fetch(quicknodeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 2,
                method: 'sendrawtransaction',
                params: [signedSpellTx.signedHex]
            })
        });

        if (!spellResponse.ok) {
            throw new Error(`Spell broadcast failed: ${spellResponse.status}`);
        }

        const spellResult = await spellResponse.json();

        if (spellResult.error) {
            throw new Error(`Spell broadcast error: ${spellResult.error.message}`);
        }

        const spellTxid = spellResult.result;

        logCallback(`Spell transaction broadcast successful!`);
        logCallback(`Spell transaction ID: ${spellTxid}`);

        return {
            commitData: {
                txid: commitTxid,
                status: 'broadcast'
            },
            spellData: {
                txid: spellTxid,
                status: 'broadcast'
            }
        };

    } catch (err) {
        logCallback(`Broadcast error: ${err.message}`);
        throw new Error(`Broadcast error: ${err.message}`);
    }
}
