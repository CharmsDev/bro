// WebGPU mining coordination and batch processing
import { WebGPUMiner } from './WebGpuMiner.js';
import { leadingZeros } from './RewardCalculator.js';

// Coordinates WebGPU mining operations and validation
export class WebGPUCoordinator {
    constructor() {
        // Set to true to enable verbose mining logs
        this.DEBUG = false;
        this.wordsPerHash = 8;
        this.gpuMiner = null;
    }

    // Initialize WebGPU miner if available and supported
    async initializeWebGPU(challengeBuffer) {
        if (this.DEBUG) {
        }
        
        const useWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
        
        if (useWebGPU) {
            this.gpuMiner = new WebGPUMiner();
            
            try {
                await this.gpuMiner.init();
                
                await this.gpuMiner.setChallenge(challengeBuffer);
                
                return this.gpuMiner;
            } catch (error) { 
                this.gpuMiner = null; 
            }
        } else {
        }
        
        return null;
    }

    // Process a single WebGPU batch
    async processBatch(state, batchSize, onProgress) {
        if (!this.gpuMiner) {
            throw new Error('WebGPU miner not initialized');
        }

        const recommendedBatchSize = this.gpuMiner.getRecommendedBatchSize ? 
            this.gpuMiner.getRecommendedBatchSize() : batchSize;
        
        const start = BigInt(state.currentNonce);
        
        if (this.gpuMiner.setStartNonceForBatch) {
            this.gpuMiner.setStartNonceForBatch(start);
        }
        
        const result = await this.gpuMiner.computeBatch(start, recommendedBatchSize);
        const bestLz = result.bestLeadingZeros >>> 0;
        
        // Convert result words to hex string
        let hex = '';
        for (let w = 0; w < this.wordsPerHash; w++) {
            const v = result.bestWords[w] >>> 0;
            hex += v.toString(16).padStart(8, '0');
        }
        
        // Check if this is a better hash
        // Better hash = more leading zeros, or same leading zeros but numerically smaller hash
        const isBetterHash = bestLz > state.bestLeadingZeros || 
            (bestLz === state.bestLeadingZeros && state.bestHash === '') ||
            (bestLz === state.bestLeadingZeros && state.bestHash !== '' && 
             BigInt('0x' + hex) < BigInt('0x' + state.bestHash));
        
        // Debug logging for hash comparison (guarded)
        if (this.DEBUG && bestLz >= 20) {
        }
        
        // Periodic progress (guarded)
        if (this.DEBUG && state.currentNonce % 1000000000 === 0) {
        }
        
        if (isBetterHash) {
            // New best hash found
            const oldBestHash = state.bestHash;
            const oldBestLZ = state.bestLeadingZeros;
            
            state.bestHash = hex;
            // Reconstruct u64 nonce from hi/lo into JS BigInt
            const bestNonce = (BigInt(result.bestNonceHi >>> 0) << 32n) | BigInt(result.bestNonceLo >>> 0);
            state.bestNonce = bestNonce;
            state.bestLeadingZeros = bestLz;
            state.currentHash = state.bestHash;
            
            if (this.DEBUG) {
            }
            
            if (onProgress) {
                onProgress({
                    currentNonce: state.currentNonce,
                    currentHash: hex,
                    currentLeadingZeros: bestLz,
                    bestHash: state.bestHash,
                    bestNonce: state.bestNonce,
                    bestLeadingZeros: state.bestLeadingZeros,
                    isNewBest: true,
                    hashRate: recommendedBatchSize / 1000, // Approximate hash rate
                    mode: 'gpu'
                });
            }
        } else {
            // No new best, but still report progress
            state.currentHash = hex;
            
            if (onProgress) {
                onProgress({
                    currentNonce: state.currentNonce,
                    currentHash: hex,
                    currentLeadingZeros: bestLz,
                    bestHash: state.bestHash,
                    bestNonce: state.bestNonce,
                    bestLeadingZeros: state.bestLeadingZeros,
                    isNewBest: false,
                    hashRate: recommendedBatchSize / 1000, // Approximate hash rate
                    mode: 'gpu'
                });
            }
        }
        
        // Update nonce for next batch
        state.currentNonce = BigInt(state.currentNonce) + BigInt(recommendedBatchSize);
        
        return { batchSize: recommendedBatchSize, processed: true };
    }

    // Check if WebGPU is supported
    isSupported() {
        return typeof navigator !== 'undefined' && 'gpu' in navigator;
    }

    // Cleanup WebGPU resources
    destroy() {
        if (this.gpuMiner) {
            this.gpuMiner.destroy();
            this.gpuMiner = null;
        }
    }
}
