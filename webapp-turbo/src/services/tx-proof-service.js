/**
 * TxProofService - Bitcoin transaction proof generator using QuickNode (Bitcoin Core RPC)
 * Uses gettxoutproof for Bitcoin Core compatible proofs
 */
import BitcoinApiRouter from './providers/bitcoin-api-router/index.js';
import { environmentConfig } from '../config/environment.js';

export class TxProofService {
    constructor() {
        this.client = new BitcoinApiRouter();
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
                const txData = await this.client.getRawTransaction(txid, true);
                const blockHeader = await this.client.getBlockHeader(txData.blockhash);
                const merkleProof = await this.client.getTxOutProof([txid]);

                return {
                    txid: txid,
                    blockhash: txData.blockhash,
                    blockheight: blockHeader.height,
                    merkleproof: merkleProof,
                    confirmations: txData.confirmations || 0
                };
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
     * Fetch merkleblock proof directly from QuickNode RPC
     * @param {string} txid - Transaction ID
     * @returns {Promise<string>} Proof hex string
     */
    async fetchMerkleBlockProof(txid, blockHash) {
        return await this.client.getTxOutProof([txid], blockHash);
    }

    /**
     * Fetch transaction data from QuickNode RPC
     */
    async fetchTxData(txid) {
        // verbose true to get JSON with blockhash/confirmations
        return await this.client.getRawTransaction(txid, true);
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
