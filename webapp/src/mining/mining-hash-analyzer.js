// Hash analysis utilities for mining operations

export class MiningHashAnalyzer {
    constructor() {}

    // Count leading zeros in bits (not hex characters)
    countLeadingZeroBits(hash) {
        // Convert hex string to binary and count leading zeros
        let leadingZeros = 0;
        for (let i = 0; i < hash.length; i++) {
            const hexChar = hash[i];
            const decimal = parseInt(hexChar, 16);

            // Each hex character represents exactly 4 bits
            // Convert to 4-bit binary representation
            for (let bit = 3; bit >= 0; bit--) {
                if ((decimal >> bit) & 1) {
                    // Found a 1 bit, stop counting
                    return leadingZeros;
                } else {
                    // Found a 0 bit, increment counter
                    leadingZeros++;
                }
            }
        }
        return leadingZeros;
    }

    // Check if a hash is better than current best
    isBetterHash(newLeadingZeros, currentBestLeadingZeros, currentBestHash) {
        return newLeadingZeros > currentBestLeadingZeros || currentBestHash === '';
    }

    // Create progress report object
    createProgressReport(state, hash, leadingZeroBits, isNewBest) {
        return {
            nonce: state.currentNonce,
            hash: hash,
            leadingZeroBits: leadingZeroBits,
            bestHash: state.bestHash,
            bestNonce: state.bestNonce,
            bestLeadingZeros: state.bestLeadingZeros,
            isNewBest: isNewBest
        };
    }

    // Create WebGPU progress report (handles BigInt nonce conversion)
    createWebGPUProgressReport(state, hash, leadingZeroBits, isNewBest, batchSize = 0) {
        return {
            nonce: isNewBest ? Number(state.bestNonce) : (state.currentNonce + batchSize - 1),
            hash: hash,
            leadingZeroBits: leadingZeroBits,
            bestHash: state.bestHash,
            bestNonce: state.bestNonce,
            bestLeadingZeros: state.bestLeadingZeros,
            isNewBest: isNewBest
        };
    }
}
