import { environmentConfig } from '../../config/environment.js';

// Broadcasts Bitcoin transactions using QuickNode API
export async function broadcastTransactions(signedCommitTx, signedSpellTx, logCallback = () => { }) {
    try {
        if (!signedCommitTx || !signedSpellTx) {
            throw new Error('Please sign the transactions first');
        }

        // Get QuickNode credentials from centralized config
        const quicknodeUrl = environmentConfig.getQuickNodeUrl();
        const apiKey = environmentConfig.getQuickNodeApiKey();
        const network = environmentConfig.getNetwork();

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
        
        // Handle different possible response structures
        let commitTxid, spellTxid;
        
        if (results && Array.isArray(results)) {
            // If result is directly an array of txids
            commitTxid = results[0] || signedCommitTx.txid;
            spellTxid = results[1] || signedSpellTx.txid;
        } else if (results && results.tx_results && Array.isArray(results.tx_results)) {
            // If result has tx_results array
            commitTxid = results.tx_results[0]?.txid || signedCommitTx.txid;
            spellTxid = results.tx_results[1]?.txid || signedSpellTx.txid;
        } else {
            // Fallback to signed transaction txids
            commitTxid = signedCommitTx.txid;
            spellTxid = signedSpellTx.txid;
        }

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
