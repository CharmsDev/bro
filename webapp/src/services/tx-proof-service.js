/**
 * TxProofService - Bitcoin transaction proof generator using QuickNode (Bitcoin Core RPC)
 * Uses gettxoutproof for Bitcoin Core compatible proofs
 */
import QuickNodeClient from './bitcoin/quicknode-client.js';

export class TxProofService {
    constructor() {
        this.client = new QuickNodeClient();
    }

    /**
     * Generate Bitcoin Core compatible transaction proof
     * @param {string} txid - Transaction ID (hex string)
     * @param {string} blockHash - Block hash (optional, will be derived if not provided)
     * @returns {Promise<Object>} Proof data object with proof hex and metadata
     */
    async getTxProof(txid, blockHash = null) {
        try {
            // Get transaction data to find the block if blockHash not provided
            let finalBlockHash = blockHash;
            let blockHeight = null;

            if (!blockHash) {
                const txData = await this.fetchTxData(txid);
                // QuickNode/Bitcoin Core: confirmations >= 1 implies confirmed
                if (!txData.confirmations || txData.confirmations < 1) {
                    throw new Error('Transaction is not confirmed');
                }
                finalBlockHash = txData.blockhash;
                // Fetch height from block header
                const header = await this.client.getBlockHeader(finalBlockHash, true);
                blockHeight = header.height;
            }

            // Fetch proof directly from RPC
            const proof = await this.fetchMerkleBlockProof(txid, finalBlockHash);

            // Return proof data object (compatible with existing API)
            return {
                txid,
                blockHash: finalBlockHash,
                blockHeight,
                txIndex: 0, // Position in block (not critical for verification)
                proof: proof,
                merkleRoot: finalBlockHash // Block hash as merkle root reference
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Fetch merkleblock proof directly from mempool.space API
     * @param {string} txid - Transaction ID
     * @returns {Promise<string>} Proof hex string
     */
    async fetchMerkleBlockProof(txid, blockHash) {
        return this.client.getTxOutProof([txid], blockHash);
    }

    /**
     * Fetch transaction data from mempool API
     */
    async fetchTxData(txid) {
        // verbose true to get JSON with blockhash/confirmations
        return this.client.getRawTransaction(txid, true);
    }

    /**
     * Validate that a proof data object is correctly formatted
     */
    validateProof(proofData) {
        if (!proofData || typeof proofData !== 'object') {
            throw new Error('Invalid proof: must be a proof data object');
        }

        if (!proofData.proof || typeof proofData.proof !== 'string') {
            throw new Error('Invalid proof: proof hex string is required');
        }

        if (proofData.proof.length % 2 !== 0) {
            throw new Error('Invalid proof: hex string must have even length');
        }

        if (!/^[0-9a-fA-F]+$/.test(proofData.proof)) {
            throw new Error('Invalid proof: contains non-hex characters');
        }

        if (!proofData.txid || !proofData.blockHash || !proofData.merkleRoot) {
            throw new Error('Invalid proof: missing required fields (txid, blockHash, merkleRoot)');
        }
        return true;
    }
}
