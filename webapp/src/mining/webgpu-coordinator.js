// WebGPU coordination and processing utilities

export class WebGPUCoordinator {
    constructor() {
        this.wordsPerHash = 8;
    }

    // Initialize WebGPU miner if available and supported
    async initializeWebGPU(mode, challengeBuffer) {
        const useWebGPU = mode === 'webgpu' && window.WebGPUMiner && new window.WebGPUMiner().isSupported();
        let gpu = null;
        
        if (useWebGPU) {
            gpu = new window.WebGPUMiner();
            try {
                await gpu.init();
                gpu.setChallenge(challengeBuffer);
                console.log('[Miner] Backend: WebGPU');
                return gpu;
            } catch (_) { 
                gpu = null; 
            }
        }
        
        if (!gpu) {
            console.log('[Miner] Backend: CPU');
        }
        
        return gpu;
    }

    // Process a single WebGPU batch
    async processBatch(gpu, state, gpuBatchSize, onProgress, hashAnalyzer) {
        const batchSize = (gpu.getRecommendedBatchSize ? gpu.getRecommendedBatchSize() : gpuBatchSize);
        const start = BigInt(state.currentNonce);
        
        if (gpu.setStartNonceForBatch) {
            gpu.setStartNonceForBatch(start);
        }
        
        const result = await gpu.computeBatch(start, batchSize);
        const bestLz = result.bestLeadingZeros >>> 0;
        
        // Convert result words to hex string
        let hex = '';
        for (let w = 0; w < this.wordsPerHash; w++) {
            const v = result.bestWords[w] >>> 0;
            hex += v.toString(16).padStart(8, '0');
        }
        
        if (hashAnalyzer.isBetterHash(bestLz, state.bestLeadingZeros, state.bestHash)) {
            // New best hash found
            state.bestHash = hex;
            // Reconstruct u64 nonce from hi/lo into JS BigInt
            const bestNonce = (BigInt(result.bestNonceHi >>> 0) << 32n) | BigInt(result.bestNonceLo >>> 0);
            state.bestNonce = bestNonce;
            state.bestLeadingZeros = bestLz;
            state.currentHash = state.bestHash;
            
            if (onProgress) {
                const progressReport = hashAnalyzer.createWebGPUProgressReport(state, state.bestHash, bestLz, true);
                onProgress(progressReport);
            }
        } else if (onProgress) {
            // No new best, but still report progress
            state.currentHash = hex;
            const progressReport = hashAnalyzer.createWebGPUProgressReport(state, hex, bestLz, false, batchSize);
            onProgress(progressReport);
        }
        
        // Update nonce for next batch
        state.currentNonce += batchSize;
        
        return { batchSize, processed: true };
    }

    // Check if progress should be saved based on interval
    shouldSaveProgress(currentNonce, lastSavedNonce, saveInterval) {
        return (currentNonce - lastSavedNonce) >= saveInterval;
    }
}
