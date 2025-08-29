import { environmentConfig } from '../../config/environment.js';
import QuickNodeClient from './quicknode-client.js';

/**
 * Broadcasts a single Bitcoin transaction to the network
 * @param {string} txHex - The signed transaction in hex format
 * @returns {Promise<{txid: string, success: boolean}>}
 */
export async function broadcastTransaction(txHex) {
    try {
        if (!txHex) {
            throw new Error('Transaction hex is required');
        }

        // Get QuickNode credentials
        const quicknodeUrl = environmentConfig.getQuickNodeUrl();
        const apiKey = environmentConfig.getQuickNodeApiKey();

        if (!quicknodeUrl || !apiKey) {
            throw new Error(`QuickNode API credentials not configured for ${environmentConfig.getNetwork()}`);
        }

        // Pre-flight: try to decode txid if possible and check if it is already known
        const client = new QuickNodeClient();
        let preflightTxId = null;
        try {
            // Best-effort: some callers pass PSBT hex accidentally; this will fail silently
            const bytes = typeof txHex === 'string' ? txHex.trim() : '';
            if (/^[0-9a-fA-F]+$/.test(bytes)) {
                // Query mempool to see if it already exists (ignore errors)
                // We can't compute txid without parsing; just attempt getrawtransaction afterwards
                // No-op here, but keep structure for future enhancements
            }
        } catch (_) { /* ignore */ }

        // Attempt a lightweight existence check: send getrawtransaction after broadcast if needed

        // Use QuickNode sendrawtransaction method
        const response = await fetch(quicknodeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'sendrawtransaction',
                params: [txHex]
            })
        });

        if (!response.ok) {
            let errorText = 'Unknown error';
            let errorDetails = '';
            try {
                errorText = await response.text();
                errorDetails = ` | Response: ${errorText.substring(0, 200)}`;
            } catch (e) {
                errorDetails = ' | Could not read response body';
            }

            console.error('[Broadcast] HTTP error on sendrawtransaction:', response.status, errorText);
            throw new Error(`Broadcast failed (${response.status}): ${errorText || response.statusText}${errorDetails}`);
        }

        const result = await response.json();

        if (result.error) {
            const msg = result.error?.message || 'Unknown RPC error';
            console.error('[Broadcast] RPC error:', msg);
            // Common error mapping for easier debugging
            const known = [
                'non-mandatory-script-verify-flag',
                'mandatory-script-verify-flag',
                'insufficient fee',
                'txn-mempool-conflict',
                'already in block chain',
                'missing-inputs',
                'non-BIP68-final'
            ].find(k => msg.toLowerCase().includes(k));
            if (known) console.error('[Broadcast] Matched known error:', known);
            throw new Error(`Broadcast failed: ${msg}`);
        }

        // QuickNode returns the txid in result field
        const txid = result.result;

        // Post-flight: confirm visibility via getrawtransaction (best-effort)
        try {
            const txInfo = await client.getRawTransaction(txid, true);
        } catch (e) {
        }

        return {
            txid: txid,
            success: true
        };
    } catch (error) {
        console.error('[Broadcast] ❌ BroadcastTransaction error:', error.message);
        throw error;
    }
}

/**
 * Broadcasts a package of Bitcoin transactions to the network
 * @param {Object} signedCommitTx - The signed commit transaction
 * @param {Object} signedSpellTx - The signed spell transaction
 * @param {Function} logCallback - Optional logging callback function
 * @returns {Promise<Object>} Broadcast results for both transactions
 */
export async function broadcastPackage(signedCommitTx, signedSpellTx, logCallback = () => { }) {
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
        logCallback(`Network: ${network}`);
        logCallback(`Endpoint: ${quicknodeUrl}`);
        logCallback(`Commit hex length: ${signedCommitTx.signedHex?.length || 0}`);
        logCallback(`Spell hex length: ${signedSpellTx.signedHex?.length || 0}`);
        
        // Log transaction hex for manual fallback
        console.log('🔥 TRANSACTION HEX FOR MANUAL BROADCAST:');
        console.log('📝 Commit Transaction Hex:');
        console.log(signedCommitTx.signedHex);
        console.log('📝 Spell Transaction Hex:');
        console.log(signedSpellTx.signedHex);
        console.log('📝 Manual Bitcoin CLI Commands:');
        console.log(`bitcoin-cli sendrawtransaction "${signedCommitTx.signedHex}"`);
        console.log(`bitcoin-cli sendrawtransaction "${signedSpellTx.signedHex}"`);
        console.log('📝 Package Test Command:');
        console.log(`bitcoin-cli testmempoolaccept '["${signedCommitTx.signedHex}","${signedSpellTx.signedHex}"]'`);

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
            let body = '';
            try { body = await packageResponse.text(); } catch(_) {}
            logCallback(`submitpackage HTTP error: ${packageResponse.status} ${body.slice(0,200)}`);
            throw new Error(`Package broadcast failed: ${packageResponse.status}`);
        }

        const packageResult = await packageResponse.json();

        if (packageResult.error) {
            const msg = packageResult.error?.message || 'Unknown RPC error';
            logCallback(`submitpackage RPC error: ${msg}`);
            // If submitpackage is unsupported, advise fallback
            if (msg.toLowerCase().includes('method not found') || msg.toLowerCase().includes('not supported')) {
                logCallback('submitpackage not supported on provider. Consider sequential sendrawtransaction with dependency order.');
            }
            throw new Error(`Package broadcast error: ${msg}`);
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

/**
 * Gets the status of a Bitcoin transaction
 * @param {string} txid - The transaction ID
 * @returns {Promise<Object>} Transaction status information
 */
export async function getTransactionStatus(txid) {
    try {
        if (!txid) {
            throw new Error('Transaction ID is required');
        }

        const client = new QuickNodeClient();
        // getrawtransaction with verbose true returns confirmations/blockhash when known
        const result = await client.getRawTransaction(txid, true);

        const confirmed = !!(result.confirmations && result.confirmations >= 1);
        return {
            confirmed,
            confirmations: result.confirmations || 0,
            blockHeight: result.height || null,
            blockHash: result.blockhash || null,
            status: confirmed ? 'confirmed' : 'pending',
            fee: result.fee, // may be undefined; QuickNode may not return fee here
            raw: result
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Get a mempool.space explorer URL for the transaction (UI only)
 * @param {string} txid - The transaction ID
 * @returns {string} Explorer URL
 */
export function getExplorerUrl(txid) {
    return environmentConfig.getExplorerUrl(txid);
}

// Legacy export for backward compatibility
export const broadcastTransactions = broadcastPackage;
