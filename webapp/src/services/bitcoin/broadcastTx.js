import { environmentConfig } from '../../config/environment.js';
import QuickNodeClient from '../providers/quicknode/client.js';

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

        // Initialize QuickNode client (handles all configuration internally)
        const client = new QuickNodeClient();

        // Use proxy-enabled client provider method for broadcast
        const txid = await client.sendRawTransaction(txHex);

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

        const network = environmentConfig.getNetwork();

        logCallback('Starting transaction broadcast process...');
        logCallback('Broadcasting both transactions as package...');
        logCallback(`Network: ${network}`);
        

        const client = new QuickNodeClient();
        const results = await client.submitPackage([signedCommitTx.signedHex, signedSpellTx.signedHex]);

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
        const txData = await client.getRawTransaction(txid, true);

        const confirmed = !!(txData.confirmations && txData.confirmations >= 1);
        return {
            confirmed,
            confirmations: txData.confirmations || 0,
            blockHeight: txData.height || null,
            blockHash: txData.blockhash || null,
            status: confirmed ? 'confirmed' : 'pending',
            fee: txData.fee, // may be undefined; QuickNode may not return fee here
            raw: txData
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
