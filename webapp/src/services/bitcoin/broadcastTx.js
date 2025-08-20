// Remove unused config import - using env variables directly

// Broadcasts Bitcoin transactions using QuickNode API
export async function broadcastTransactions(signedCommitTx, signedSpellTx, logCallback = () => { }) {
    try {
        if (!signedCommitTx || !signedSpellTx) {
            throw new Error('Please sign the transactions first');
        }

        // Determine network and select appropriate credentials
        const network = import.meta.env.VITE_BITCOIN_NETWORK || 'testnet4';

        let quicknodeUrl, apiKey;

        if (network === 'mainnet') {
            quicknodeUrl = import.meta.env.VITE_QUICKNODE_BITCOIN_MAINNET_URL;
            apiKey = import.meta.env.VITE_QUICKNODE_BITCOIN_MAINNET_API_KEY;
        } else {
            // Default to testnet4
            quicknodeUrl = import.meta.env.VITE_QUICKNODE_BITCOIN_TESTNET_URL;
            apiKey = import.meta.env.VITE_QUICKNODE_API_KEY;
        }

        if (!quicknodeUrl || !apiKey) {
            throw new Error(`QuickNode API credentials not configured for ${network}`);
        }

        logCallback('Starting transaction broadcast process...');
        logCallback('Broadcasting both transactions as package...');

        // Broadcast both transactions as a package using submitpackage
        const packageResponse = await fetch(quicknodeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'submitpackage',
                params: [
                    [signedCommitTx.signedHex, signedSpellTx.signedHex]
                ]
            })
        });

        if (!packageResponse.ok) {
            throw new Error(`Package broadcast failed: ${packageResponse.status}`);
        }

        const packageResult = await packageResponse.json();

        if (packageResult.error) {
            throw new Error(`Package broadcast error: ${packageResult.error.message}`);
        }

        // Extract transaction IDs from package result
        const results = packageResult.result;
        const commitTxid = results.tx_results[0]?.txid || signedCommitTx.txid;
        const spellTxid = results.tx_results[1]?.txid || signedSpellTx.txid;

        logCallback(`Package broadcast successful!`);
        logCallback(`Commit transaction ID: ${commitTxid}`);
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
