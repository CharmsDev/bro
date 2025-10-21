import { environmentConfig } from '../../config/environment.js';
import BitcoinApiRouter from '../providers/bitcoin-api-router/index.js';

/**
 * Broadcasts a single Bitcoin transaction to the network
 * @param {string} txHex - The signed transaction in hex format
 * @returns {Promise<{txid: string, success: boolean}>}
 */
export async function broadcastTx(txHex) {
    try {
        if (!txHex) {
            throw new Error('Transaction hex is required');
        }

        // Initialize Bitcoin API router (handles all configuration internally)
        const client = new BitcoinApiRouter();

        // Use proxy-enabled client provider method for broadcast
        const txid = await client.sendRawTransaction(txHex);

        // Post-flight: confirm visibility via getrawtransaction (best-effort)
        // Skip verification - transaction was successfully broadcast
        // Verification will fail until transaction is confirmed in a block

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
export async function broadcastTxPackage(signedCommitTx, signedSpellTx, logCallback = () => { }) {
    try {
        if (!signedCommitTx || !signedSpellTx) {
            throw new Error('Please sign the transactions first');
        }

        const network = environmentConfig.getNetwork();

        logCallback('Starting transaction broadcast process...');
        logCallback('Broadcasting both transactions as package...');
        logCallback(`Network: ${network}`);
        
        // ============================================================
        // 🚀 BROADCAST ENABLED - REAL TRANSACTION SUBMISSION
        // ============================================================
        
        const commitHex = signedCommitTx.signedHex;
        const spellHex = signedSpellTx.signedHex;
        
        // Generate bitcoin-cli testmempoolaccept command for debugging
        const rpcUser = network === 'mainnet' 
            ? (import.meta.env.VITE_BITCOIN_MAINNET_RPC_USER || 'bitcoinrpc_7x9k3m2p8q')
            : (import.meta.env.VITE_BITCOIN_TESTNET_RPC_USER || 'bitcoinrpc');
        const rpcPassword = network === 'mainnet'
            ? (import.meta.env.VITE_BITCOIN_MAINNET_RPC_PASSWORD || 'A4v9zL2kP8mW3nQ6tR5jX2yF7uB9cH')
            : (import.meta.env.VITE_BITCOIN_TESTNET_RPC_PASSWORD || 'your_password');
        const rpcHost = network === 'mainnet'
            ? (import.meta.env.VITE_BITCOIN_MAINNET_RPC_HOST || 'localhost')
            : (import.meta.env.VITE_BITCOIN_TESTNET_RPC_HOST || '127.0.0.1');
        const rpcPort = network === 'mainnet' 
            ? (import.meta.env.VITE_BITCOIN_MAINNET_RPC_PORT || '8332')
            : (import.meta.env.VITE_BITCOIN_TESTNET_RPC_PORT || '18332');
        
        // ACTUAL BROADCAST
        const client = new BitcoinApiRouter();
        logCallback(`🚀 Sending package: [commit: ${signedCommitTx.txid.slice(0,8)}..., spell: ${signedSpellTx.txid.slice(0,8)}...]`);
        
        const results = await client.submitPackage([signedCommitTx.signedHex, signedSpellTx.signedHex]);
        
        logCallback(`✅ Package broadcast result: ${JSON.stringify(results)}`);

        // Handle different possible response structures
        let commitTxid, spellTxid;
        let commitAccepted = false;
        let spellAccepted = false;

        if (results && Array.isArray(results)) {
            commitTxid = results[0];
            spellTxid = results[1];
            commitAccepted = !!commitTxid;
            spellAccepted = !!spellTxid;
        } else if (results && results['tx-results']) {
            const txResults = results['tx-results'];
            const resultsArray = Object.values(txResults);
            
            commitTxid = resultsArray[0]?.txid;
            spellTxid = resultsArray[1]?.txid;
            
            // Accept if txid exists, even if "allowed: false" with "txn-already-in-mempool"
            const commitAlreadyInMempool = resultsArray[0]?.['reject-reason'] === 'txn-already-in-mempool';
            const spellAlreadyInMempool = resultsArray[1]?.['reject-reason'] === 'txn-already-in-mempool';
            
            commitAccepted = !!commitTxid && (resultsArray[0]?.allowed !== false || commitAlreadyInMempool);
            spellAccepted = !!spellTxid && (resultsArray[1]?.allowed !== false || spellAlreadyInMempool);
            
            logCallback(`Commit result: ${JSON.stringify(resultsArray[0])}`);
            logCallback(`Spell result: ${JSON.stringify(resultsArray[1])}`);
            
            if (commitAlreadyInMempool) {
                logCallback(`ℹ️  Commit transaction already in mempool (this is OK)`);
            }
            if (spellAlreadyInMempool) {
                logCallback(`ℹ️  Spell transaction already in mempool (this is OK)`);
            }
        } else if (results && results.tx_results && Array.isArray(results.tx_results)) {
            const commitResult = results.tx_results[0];
            const spellResult = results.tx_results[1];
            
            commitTxid = commitResult?.txid;
            spellTxid = spellResult?.txid;
            commitAccepted = commitResult?.allowed === true || !!commitTxid;
            spellAccepted = spellResult?.allowed === true || !!spellTxid;
            
            logCallback(`Commit result: ${JSON.stringify(commitResult)}`);
            logCallback(`Spell result: ${JSON.stringify(spellResult)}`);
            
            // Log rejection reasons
            if (!commitAccepted && commitResult?.['reject-reason']) {
                logCallback(`⚠️ Commit rejected: ${commitResult['reject-reason']}`);
            }
            if (!spellAccepted && spellResult?.['reject-reason']) {
                logCallback(`⚠️ Spell rejected: ${spellResult['reject-reason']}`);
            }
        } else {
            throw new Error('Invalid package submission response format');
        }

        // CRITICAL: Verify both transactions were accepted
        if (!commitAccepted || !commitTxid) {
            throw new Error('Commit transaction was not accepted by the network');
        }
        if (!spellAccepted || !spellTxid) {
            throw new Error('Spell transaction was not accepted by the network. Commit may have been broadcast alone!');
        }

        logCallback(`✅ Package broadcast successful!`);
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
export async function getTxStatus(txid) {
    try {
        if (!txid) {
            throw new Error('Transaction ID is required');
        }

        const client = new BitcoinApiRouter();
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

