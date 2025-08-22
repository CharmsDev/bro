import { environmentConfig } from '../../config/environment.js';

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


            throw new Error(`Broadcast failed (${response.status}): ${errorText || response.statusText}${errorDetails}`);
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(`Broadcast failed: ${result.error.message}`);
        }

        // QuickNode returns the txid in result field
        const txid = result.result;

        return {
            txid: txid,
            success: true
        };
    } catch (error) {
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


        const response = await fetch(environmentConfig.getTransactionStatusUrl(txid));

        if (!response.ok) {
            if (response.status === 404) {
                return {
                    confirmed: false,
                    status: 'pending',
                    message: 'Transaction not found. It may be pending or not broadcast.'
                };
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        return {
            confirmed: result.status?.confirmed || false,
            confirmations: result.status?.confirmations || 0,
            blockHeight: result.status?.block_height,
            blockHash: result.status?.block_hash,
            status: result.status?.confirmed ? 'confirmed' : 'pending',
            fee: result.fee,
            raw: result
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Get a mempool.space explorer URL for the transaction
 * @param {string} txid - The transaction ID
 * @returns {string} Explorer URL
 */
export function getExplorerUrl(txid) {
    return environmentConfig.getExplorerUrl(txid);
}

// Legacy export for backward compatibility
export const broadcastTransactions = broadcastPackage;
