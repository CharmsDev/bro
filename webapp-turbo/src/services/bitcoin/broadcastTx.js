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

        const client = new BitcoinApiRouter();
        const network = environmentConfig.getNetwork();
        const txid = await client.sendRawTransaction(txHex);

        // Optional verification (best effort)
        const waitTime = network === 'mainnet' ? 2000 : 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        try {
            await client.getMempoolEntry(txid);
        } catch (verifyError) {
            // Verification failed but broadcast succeeded - continue
        }

        return {
            txid: txid,
            success: true,
            explorerUrl: getExplorerUrl(txid)
        };
    } catch (error) {
        console.error('Broadcast failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Broadcasts a package of Bitcoin transactions to the network
 * @param {Object} signedCommitTx - The signed commit transaction
 * @param {Object} signedSpellTx - The signed spell transaction
 * @param {Function} logCallback - Optional logging callback function
 * @returns {Promise<Object>} Broadcast results for both transactions
 */
export async function broadcastTxPackage(signedCommitTx, signedSpellTx, logCallback = console.log) {
    
    try {
        if (!signedCommitTx || !signedSpellTx) {
            const error = 'Please sign the transactions first';
            console.error('❌ [PACKAGE] Validation failed:', error);
            throw new Error(error);
        }

        const network = environmentConfig.getNetwork();
        const client = new BitcoinApiRouter();
        
        // DEBUG: Uncomment to generate bitcoin-cli testmempoolaccept command for manual testing
        // const rpcUser = network === 'mainnet' 
        //     ? (import.meta.env.VITE_BITCOIN_MAINNET_RPC_USER || 'bitcoinrpc_7x9k3m2p8q')
        //     : (import.meta.env.VITE_BITCOIN_TESTNET_RPC_USER || 'bitcoinrpc');
        // const rpcPassword = network === 'mainnet'
        //     ? (import.meta.env.VITE_BITCOIN_MAINNET_RPC_PASSWORD || 'A4v9zL2kP8mW3nQ6tR5jX2yF7uB9cH')
        //     : (import.meta.env.VITE_BITCOIN_TESTNET_RPC_PASSWORD || 'your_password');
        // const rpcHost = network === 'mainnet'
        //     ? (import.meta.env.VITE_BITCOIN_MAINNET_RPC_HOST || 'localhost')
        //     : (import.meta.env.VITE_BITCOIN_TESTNET_RPC_HOST || '127.0.0.1');
        // const rpcPort = network === 'mainnet' 
        //     ? (import.meta.env.VITE_BITCOIN_MAINNET_RPC_PORT || '8332')
        //     : (import.meta.env.VITE_BITCOIN_TESTNET_RPC_PORT || '18332');
        // const testCommand = `bitcoin-cli -rpcuser=${rpcUser} -rpcpassword=${rpcPassword} -rpcconnect=${rpcHost} -rpcport=${rpcPort} testmempoolaccept '["${signedCommitTx.signedHex}","${signedSpellTx.signedHex}"]'`;
        // console.log('🔧 [DEBUG] Bitcoin CLI test command:');
        // console.log(testCommand);
        // logCallback('🔧 [DEBUG] You can test the package manually with bitcoin-cli testmempoolaccept');
        
        const results = await client.submitPackage([signedCommitTx.signedHex, signedSpellTx.signedHex]);

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
        } else if (results && results.tx_results && Array.isArray(results.tx_results)) {
            const commitResult = results.tx_results[0];
            const spellResult = results.tx_results[1];
            
            commitTxid = commitResult?.txid;
            spellTxid = spellResult?.txid;
            commitAccepted = commitResult?.allowed === true || !!commitTxid;
            spellAccepted = spellResult?.allowed === true || !!spellTxid;
        } else {
            throw new Error('Invalid package submission response format');
        }

        // Verify BOTH transactions were accepted (atomic package)
        if (!commitAccepted || !commitTxid) {
            throw new Error('Package broadcast failed: Commit transaction was not accepted by the network');
        }
        if (!spellAccepted || !spellTxid) {
            throw new Error('Package broadcast failed: Spell transaction was not accepted by the network');
        }
        
        if (!commitTxid || !spellTxid) {
            throw new Error('Package broadcast incomplete: Missing transaction ID(s)');
        }

        return {
            success: true,
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
        console.error('Package broadcast failed:', err.message);
        
        return {
            success: false,
            error: err.message,
            commitData: null,
            spellData: null
        };
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

