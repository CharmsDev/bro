// WebGPU mining coordination and batch processing
import { MiningValidator } from './mining-validator.js';
import { CPUMiner } from './cpu-miner.js';
import { MiningHashAnalyzer } from './mining-hash-analyzer.js';

// Coordinates WebGPU mining operations and validation
export class WebGPUCoordinator {
    constructor() {
        this.wordsPerHash = 8;
        // Validation components for mining verification
        this.cpuMiner = new CPUMiner();
        this.hashAnalyzer = new MiningHashAnalyzer();
        this.validationEnabled = false; // Disabled for performance optimization
    }

    // Initialize WebGPU miner if available and supported
    async initializeWebGPU(mode, challengeBuffer) {
        const useWebGPU = (mode === 'gpu' || mode === 'webgpu') && window.WebGPUMiner && new window.WebGPUMiner().isSupported();
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
            
            // 🔍 TEMPORARY VALIDATION: Compare GPU vs CPU nonce calculation
            if (this.validationEnabled) {
                await this.validateGpuVsCpu(state.challenge, bestNonce, hex, bestLz);
            }
            
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
    // Apply same logic as CPU mining: save every saveInterval nonces
    shouldSaveProgress(currentNonce, lastSavedNonce, saveInterval) {
        return (currentNonce - lastSavedNonce) >= saveInterval;
    }

    // 🔍 TEMPORARY VALIDATION: Compare GPU vs CPU nonce calculation
    async validateGpuVsCpu(challenge, nonce, gpuHash, gpuLeadingZeros) {
        try {
            console.log('\n🔍 ===== GPU vs CPU VALIDATION =====');
            console.log(`Challenge: ${challenge}`);
            console.log(`Nonce: ${nonce.toString()}`);
            console.log(`GPU Hash: ${gpuHash}`);
            console.log(`GPU Leading Zeros: ${gpuLeadingZeros} bits`);
            
            // Method 1: CPU Miner calculation (same as GPU should use)
            const challengeBuffer = new TextEncoder().encode(challenge);
            const cpuHash = await this.cpuMiner.step(challengeBuffer, Number(nonce));
            const cpuLeadingZeros = this.hashAnalyzer.countLeadingZeroBits(cpuHash);
            
            console.log(`CPU Hash: ${cpuHash}`);
            console.log(`CPU Leading Zeros: ${cpuLeadingZeros} bits`);
            
            // Method 2: MiningValidator calculation (contract validation)
            const validatorResult = MiningValidator.validateNonce(challenge, Number(nonce), 0);
            const validatorHash = validatorResult.details?.computedHash || 'ERROR';
            const validatorLeadingZeros = validatorResult.details?.leadingZeroBits || 0;
            
            console.log(`Validator Hash: ${validatorHash}`);
            console.log(`Validator Leading Zeros: ${validatorLeadingZeros} bits`);
            
            // Compare all three methods
            const gpuCpuMatch = gpuHash.toLowerCase() === cpuHash.toLowerCase();
            const cpuValidatorMatch = cpuHash.toLowerCase() === validatorHash.toLowerCase();
            const allMatch = gpuCpuMatch && cpuValidatorMatch;
            
            console.log('\n📊 COMPARISON RESULTS:');
            console.log(`GPU ↔ CPU Match: ${gpuCpuMatch ? '✅ YES' : '❌ NO'}`);
            console.log(`CPU ↔ Validator Match: ${cpuValidatorMatch ? '✅ YES' : '❌ NO'}`);
            console.log(`All Methods Match: ${allMatch ? '✅ YES' : '❌ NO'}`);
            
            if (!allMatch) {
                console.log('\n⚠️  MISMATCH DETECTED! Different calculation methods producing different results!');
                console.log('This indicates a bug in one of the implementations.');
            } else {
                console.log('\n🎉 PERFECT MATCH! All calculation methods agree.');
            }
            
            console.log('=====================================\n');
            
        } catch (error) {
            console.error('❌ Validation error:', error);
        }
    }

}
