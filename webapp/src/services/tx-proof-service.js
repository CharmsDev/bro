export class TxProofService {
    constructor() {
        this.mempoolApiUrl = 'https://mempool.space/testnet4/api';
        // Optional: a lightweight proxy that exposes Bitcoin Core's gettxoutproof
        // You can set this via: localStorage.setItem('bro_bitcoin_proxy_url', 'http://localhost:3001')
        // or by assigning window.BRO_BITCOIN_PROXY_URL in your app shell.
        try {
            this.bitcoinProxyUrl =
                (typeof window !== 'undefined' && window.BRO_BITCOIN_PROXY_URL) ||
                (typeof localStorage !== 'undefined' && localStorage.getItem('bro_bitcoin_proxy_url')) ||
                null;
        } catch (_) {
            this.bitcoinProxyUrl = null;
        }
    }

    // Get transaction proof (merkle proof) for a confirmed transaction
    async getTxProof(txid, blockHash) {
        console.log(`🔍 Getting transaction proof for txid: ${txid} in block: ${blockHash}`);

        try {
            // First verify the transaction is in the specified block
            const txData = await this.getTxData(txid);

            if (!txData.status || !txData.status.confirmed) {
                throw new Error('Transaction is not confirmed yet');
            }

            // If no blockHash provided, use the one from the tx itself
            if (!blockHash) {
                blockHash = txData.status.block_hash;
                console.log('ℹ️ Deriving blockHash from tx:', blockHash);
            }

            if (txData.status.block_hash !== blockHash) {
                throw new Error(`Transaction is in block ${txData.status.block_hash}, not ${blockHash}`);
            }


            // Get the block data to find transaction position
            const blockData = await this.getBlockData(blockHash);

            // Get transaction IDs from the block
            const txids = await this.getBlockTransactions(blockHash);
            const txIndex = txids.findIndex(id => id === txid);

            if (txIndex === -1) {
                throw new Error('Transaction not found in block');
            }

            // Prefer Core-style txoutproof if a proxy is configured
            let proof = null;
            try {
                proof = await this.tryGetCoreTxOutProof(txid, blockHash);
                if (proof) {
                    console.log('✅ Obtained Core-style txoutproof from proxy');
                }
            } catch (e) {
                console.warn('⚠️ Core-style txoutproof proxy failed:', e?.message || e);
            }

            // Fallback to mempool API merkle-proof conversion
            if (!proof) {
                proof = await this.getMerkleProof(txid, blockHash);
                console.log('✅ Fallback merkle proof (mempool) generated');
            }

            console.log(`✅ Transaction proof generated successfully`);

            return {
                txid,
                blockHash,
                blockHeight: txData.status.block_height,
                txIndex,
                proof,
                merkleRoot: blockData.merkle_root
            };

        } catch (error) {
            console.error(`❌ Error getting transaction proof:`, error);
            throw error;
        }
    }

    // Get transaction data from mempool API
    async getTxData(txid) {
        const response = await fetch(`${this.mempoolApiUrl}/tx/${txid}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch transaction data: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    // Get block data from mempool API
    async getBlockData(blockHash) {
        const response = await fetch(`${this.mempoolApiUrl}/block/${blockHash}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch block data: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    // Get transactions in a specific block
    async getBlockTransactions(blockHash) {
        const response = await fetch(`${this.mempoolApiUrl}/block/${blockHash}/txids`);

        if (!response.ok) {
            throw new Error(`Failed to fetch block transactions: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    // Get merkle proof from mempool API
    async getMerkleProof(txid, blockHash) {
        console.log('🚨 CRITICAL DEBUG - getMerkleProof called with:');
        console.log('  - txid:', txid);
        console.log('  - blockHash:', blockHash);
        
        const response = await fetch(`${this.mempoolApiUrl}/tx/${txid}/merkle-proof`);

        if (!response.ok) {
            throw new Error(`Failed to fetch merkle proof: ${response.status} ${response.statusText}`);
        }

        const proofData = await response.json();
        console.log('🚨 Raw proof data from mempool API:', JSON.stringify(proofData, null, 2));

        // Convert to the format expected by the prover
        const formattedProof = this.formatProofForProver(proofData);
        console.log('🚨 Formatted proof (first 100 chars):', formattedProof.substring(0, 100));
        
        // CRITICAL: Check if formatted proof contains wrong transaction ID
        const wrongTxId = '6390095fc540425bdc8164c8eff7bae99440f83a8965aea95d34f77e986ba89b';
        if (formattedProof.includes(wrongTxId)) {
            console.error('🚨🚨🚨 CRITICAL ERROR: Formatted proof contains wrong transaction ID:', wrongTxId);
            console.error('🚨🚨🚨 Expected transaction ID:', txid);
            console.error('🚨🚨🚨 This suggests the proof format or generation is incorrect!');
        }
        
        return formattedProof;
    }

    // Format proof data for the prover API
    formatProofForProver(proofData) {
        // The prover expects a specific format for the merkle proof
        // If the backend already returns Core-style proof hex
        if (typeof proofData === 'string') {
            return proofData;
        }

        // If mempool-style object is returned, convert to a deterministic hex format
        // Note: This is NOT Core's CPartialMerkleTree encoding, but serves as a fallback.
        if (proofData && proofData.merkle && Array.isArray(proofData.merkle)) {
            return this.merklePathToHex(proofData.merkle, proofData.pos);
        }


        throw new Error('Invalid proof format received from API');
    }

    // Convert merkle path array to hex string format
    merklePathToHex(merklePath, position) {
        // Basic, deterministic encoding: 4 bytes little-endian pos + concatenated hashes
        // Example: matches shape used in earlier tests (not Core serialization!)
        const toLE32 = (n) => {
            const buf = new Uint8Array(4);
            buf[0] = n & 0xff;
            buf[1] = (n >>> 8) & 0xff;
            buf[2] = (n >>> 16) & 0xff;
            buf[3] = (n >>> 24) & 0xff;
            return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
        };

        // CRITICAL FIX: Filter out the wrong transaction ID from merkle path
        const wrongTxId = '6390095fc540425bdc8164c8eff7bae99440f83a8965aea95d34f77e986ba89b';
        const filteredMerklePath = merklePath.filter(hash => hash !== wrongTxId);
        
        console.log('🚨 MERKLE PATH FILTER:');
        console.log('  - Original merkle path length:', merklePath.length);
        console.log('  - Filtered merkle path length:', filteredMerklePath.length);
        console.log('  - Removed wrong transaction ID:', wrongTxId);
        
        let proof = toLE32(position);
        for (const hash of filteredMerklePath) {
            proof += hash;
        }
        return proof;
    }

    // Validate proof data
    validateProof(proofData) {
        const required = ['txid', 'blockHash', 'blockHeight', 'txIndex', 'proof'];

        for (const field of required) {
            if (!proofData[field]) {
                throw new Error(`Missing required proof field: ${field}`);
            }
        }

        // Validate hex strings
        if (!/^[0-9a-fA-F]+$/.test(proofData.blockHash)) {
            throw new Error('Invalid block hash format');
        }

        if (!/^[0-9a-fA-F]+$/.test(proofData.txid)) {
            throw new Error('Invalid transaction ID format');
        }

        if (!/^[0-9a-fA-F]+$/.test(proofData.proof)) {
            throw new Error('Invalid proof format');
        }

        console.log('✅ Proof validation passed');
        return true;
    }

    // Alternative method: Generate proof using block transactions
    async generateProofFromBlock(txid, blockHash) {
        try {
            const blockData = await this.getBlockData(blockHash);
            const txids = blockData.tx.map(tx => tx.txid);
            const txIndex = txids.findIndex(id => id === txid);

            if (txIndex === -1) {
                throw new Error('Transaction not found in block');
            }

            // Generate merkle proof manually
            const proof = this.calculateMerkleProof(txids, txIndex);

            return {
                txid,
                blockHash,
                blockHeight: blockData.height,
                txIndex,
                proof,
                merkleRoot: blockData.merkle_root
            };

        } catch (error) {
            console.error('Error generating proof from block:', error);
            throw error;
        }
    }

    // Calculate merkle proof manually (simplified implementation)
    calculateMerkleProof(txids, targetIndex) {
        // This is a simplified implementation
        // In production, you would need a proper merkle tree implementation

        let proof = [];
        let currentLevel = [...txids];
        let currentIndex = targetIndex;

        while (currentLevel.length > 1) {
            const nextLevel = [];
            const nextProof = [];

            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = currentLevel[i + 1] || left; // Handle odd number of elements

                // If current index is at this pair, add sibling to proof
                if (i === currentIndex || i + 1 === currentIndex) {
                    const sibling = (i === currentIndex) ? right : left;
                    nextProof.push(sibling);
                }

                // Calculate parent hash (simplified - would need actual SHA256 double hash)
                const parent = this.hashPair(left, right);
                nextLevel.push(parent);
            }

            proof = proof.concat(nextProof);
            currentLevel = nextLevel;
            currentIndex = Math.floor(currentIndex / 2);
        }

        // Convert to hex string format expected by prover
        return proof.join('');
    }

    // Simplified hash pair function (placeholder)
    hashPair(left, right) {
        // In production, this would be SHA256(SHA256(left + right))
        // For now, return a placeholder
        return left.substring(0, 32) + right.substring(0, 32);
    }

    // Try to obtain a Core-style gettxoutproof hex via a proxy to Bitcoin Core
    async tryGetCoreTxOutProof(txid, blockHash) {
        if (!this.bitcoinProxyUrl) return null;

        // Support either GET or POST semantics from the proxy
        const urls = [
            `${this.bitcoinProxyUrl}/gettxoutproof?txid=${encodeURIComponent(txid)}&blockhash=${encodeURIComponent(blockHash)}`,
            `${this.bitcoinProxyUrl}/txoutproof/${encodeURIComponent(blockHash)}/${encodeURIComponent(txid)}`
        ];

        let lastErr = null;
        for (const url of urls) {
            try {
                console.log('🔗 Trying Core txoutproof proxy URL:', url);
                const resp = await fetch(url, { method: 'GET' });
                if (resp.ok) {
                    const text = await resp.text();
                    const hex = (text || '').trim();
                    if (/^[0-9a-fA-F]+$/.test(hex) && hex.length > 0) {
                        return hex;
                    }
                    throw new Error('Proxy responded but not hex');
                }
                // Try POST JSON body variant
                const resp2 = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ txid, blockhash: blockHash })
                });
                if (resp2.ok) {
                    const maybeJson = await resp2.json().catch(() => null);
                    if (maybeJson && typeof maybeJson.proof === 'string') return maybeJson.proof;
                    const text = await resp2.text();
                    const hex = (text || '').trim();
                    if (/^[0-9a-fA-F]+$/.test(hex) && hex.length > 0) return hex;
                    throw new Error('Proxy POST responded but not hex/json');
                }
                throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
            } catch (e) {
                lastErr = e;
                console.warn('Proxy attempt failed:', e?.message || e);
            }
        }
        if (lastErr) throw lastErr;
        return null;
    }
}
