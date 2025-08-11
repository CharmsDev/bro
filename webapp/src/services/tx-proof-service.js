/**
 * TxProofService - Bitcoin transaction proof generator using mempool.space API
 * Uses mempool.space merkleblock-proof endpoint for Bitcoin Core compatible proofs
 */

export class TxProofService {
    constructor() {
        this.mempoolApiUrl = 'https://mempool.space/testnet4/api';
    }

    /**
     * Generate Bitcoin Core compatible transaction proof
     * @param {string} txid - Transaction ID (hex string)
     * @param {string} blockHash - Block hash (optional, will be derived if not provided)
     * @returns {Promise<Object>} Proof data object with proof hex and metadata
     */
    async getTxProof(txid, blockHash = null) {
        console.log(`🔍 Generating Bitcoin Core compatible proof for transaction: ${txid}`);

        try {
            // Get transaction data to find the block if blockHash not provided
            let finalBlockHash = blockHash;
            let blockHeight = null;
            
            if (!blockHash) {
                const txData = await this.fetchTxData(txid);
                
                if (!txData.status.confirmed) {
                    throw new Error('Transaction is not confirmed');
                }

                finalBlockHash = txData.status.block_hash;
                blockHeight = txData.status.block_height;
            }
            
            console.log(`📦 Block: ${finalBlockHash}${blockHeight ? ` (height: ${blockHeight})` : ''}`);

            // Fetch proof directly from mempool.space API
            console.log('🚀 Fetching Bitcoin Core proof from mempool.space...');
            const proof = await this.fetchMerkleBlockProof(txid);
            
            console.log(`✅ Proof fetched: ${proof.length / 2} bytes`);
            
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
            console.error(`❌ Error generating proof:`, error);
            throw error;
        }
    }

    /**
     * Fetch merkleblock proof directly from mempool.space API
     * @param {string} txid - Transaction ID
     * @returns {Promise<string>} Proof hex string
     */
    async fetchMerkleBlockProof(txid) {
        const response = await fetch(`${this.mempoolApiUrl}/tx/${txid}/merkleblock-proof`);
        if (!response.ok) {
            throw new Error(`Failed to fetch merkleblock proof: ${response.status}`);
        }
        return response.text();
    }

    /**
     * Fetch transaction data from mempool API
     */
    async fetchTxData(txid) {
        const response = await fetch(`${this.mempoolApiUrl}/tx/${txid}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch transaction data: ${response.status}`);
        }
        return response.json();
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
        
        console.log(`✅ Proof validation passed: ${proofData.proof.length / 2} bytes`);
        return true;
    }
}
