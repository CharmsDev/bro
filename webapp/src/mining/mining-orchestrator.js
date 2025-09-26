import { MiningValidator } from './mining-validator.js';
import { CPUMiner } from './cpu-miner.js';
import { MiningHashAnalyzer } from './mining-hash-analyzer.js';
import { WebGPUCoordinator } from './webgpu-coordinator.js';

// Bitcoin proof-of-work mining orchestrator with CPU and GPU support
class BitcoinMiner {
    constructor() {
        // Core state
        this.isRunning = false;
        this.currentNonce = 0;
        this.currentHash = '';
        this.bestHash = '';
        this.bestNonce = 0;
        this.bestLeadingZeros = 0;
        this.challenge = '';
        this.stoppedManually = false;
        
        // Configuration
        this.saveInterval = 10000; // CPU mining: save every 10,000 nonces
        this.gpuSaveInterval = 250000000; // GPU mining: save every 250,000,000 nonces
        this.mode = 'cpu';
        this.gpuBatchSize = 256 * 256;
        this.gpuLastSavedNonce = 0;
        
        // Challenge info
        this.challengeTxid = '';
        this.challengeVout = 0;
        this.validationResults = null;
        
        // Helper instances - REMOVED MiningPersistence
        this.hashAnalyzer = new MiningHashAnalyzer();
        this.webgpuCoordinator = new WebGPUCoordinator();
        this.cpuMiner = new CPUMiner();
    }

    generateChallenge(seedTxid, vout) {
        return `${seedTxid}:${vout}`;
    }



    // SIMPLIFIED: Save current nonce + best hash + best nonce
    async saveMiningProgress() {
        try {
            const { Storage } = await import('../state/storage/Storage.js');
            
            // Save mining progress to Storage system (step2 data)
            const miningProgress = {
                currentNonce: typeof this.currentNonce === 'bigint' ? this.currentNonce.toString() : this.currentNonce,
                isRunning: this.isRunning
            };
            
            // Save mining result if we have one
            const miningResult = this.bestHash ? {
                bestHash: this.bestHash,
                bestNonce: typeof this.bestNonce === 'bigint' ? this.bestNonce.toString() : this.bestNonce,
                bestLeadingZeros: this.bestLeadingZeros,
                current: typeof this.currentNonce === 'bigint' ? this.currentNonce.toString() : this.currentNonce
            } : null;
            
            Storage.updateStep(2, {
                data: {
                    miningProgress: miningProgress,
                    miningResult: miningResult,
                    isRunning: this.isRunning,
                    mode: this.mode || 'cpu'
                }
            });
            
        } catch (error) {
            console.warn('[MiningOrchestrator] Error saving mining progress:', error);
        }
    }

    async loadMiningProgress() {
        try {
            const { Storage } = await import('../state/storage/Storage.js');
            const state = Storage.getState();
            
            // Load mining progress from Storage system (step2 data)
            const miningProgress = state.steps?.step2?.data?.miningProgress;
            const miningResult = state.steps?.step2?.data?.miningResult;
            
            if (miningProgress) {
                // Convert string back to number if needed
                this.currentNonce = typeof miningProgress.currentNonce === 'string' ? 
                    parseInt(miningProgress.currentNonce) : (miningProgress.currentNonce || 0);
            }
            
            if (miningResult) {
                this.bestHash = miningResult.bestHash || '';
                // Convert string back to number if needed
                this.bestNonce = typeof miningResult.bestNonce === 'string' ? 
                    parseInt(miningResult.bestNonce) : (miningResult.bestNonce || 0);
                this.bestLeadingZeros = miningResult.bestLeadingZeros || 0;
                const resultCurrent = typeof miningResult.current === 'string' ? 
                    parseInt(miningResult.current) : (miningResult.current || 0);
                this.currentNonce = Math.max(this.currentNonce, resultCurrent);
                
                console.log('[MiningOrchestrator] ✅ Mining result loaded from Storage system');
                
                return {
                    nonce: this.currentNonce,
                    bestHash: this.bestHash,
                    bestNonce: this.bestNonce,
                    bestLeadingZeros: this.bestLeadingZeros
                };
            }
            
            return null;
        } catch (error) {
            console.warn('[MiningOrchestrator] Error loading mining progress:', error);
            return null;
        }
    }


    saveMiningResult(result) {
        const resultData = {
            nonce: typeof result.nonce === 'bigint' ? result.nonce.toString() : result.nonce,
            hash: result.hash,
            bestHash: result.bestHash,
            bestNonce: typeof result.bestNonce === 'bigint' ? result.bestNonce.toString() : result.bestNonce,
            bestLeadingZeros: result.bestLeadingZeros,
            challenge: this.challenge,
            challengeTxid: this.challengeTxid,
            challengeVout: this.challengeVout,
            timestamp: Date.now(),
            completed: true
        };
        localStorage.setItem('miningResult', JSON.stringify(resultData));
    }

    async loadMiningResult() {
        const saved = localStorage.getItem('miningResult');
        if (saved) {
            try {
                const resultData = JSON.parse(saved);
                if (resultData.completed) {
                    return resultData;
                }
            } catch (error) {
                console.error('Error loading mining result:', error);
                await this.clearMiningResult();
            }
        }
        return null;
    }

    async clearMiningResult() {
        try {
            const { Storage } = await import('../state/storage/Storage.js');
            
            // Clear only mining result, keep progress
            const state = Storage.getState();
            const currentProgress = state.steps?.step2?.data?.miningProgress;
            
            Storage.updateStep(2, {
                data: {
                    miningProgress: currentProgress, // Keep progress
                    miningResult: null,              // Clear result
                    isRunning: false,
                    mode: 'cpu'
                }
            });
            
            console.log('[MiningOrchestrator] ✅ Mining result cleared from Storage system');
        } catch (error) {
            console.warn('[MiningOrchestrator] Error clearing mining result:', error);
        }
    }

    async minePoW(challenge, onProgress, resumeFromSaved = false) {
        this.isRunning = true;
        this.challenge = challenge;
        this.stoppedManually = false;

        // Initialize state
        this.initializeState(resumeFromSaved);
        
        const challengeBuffer = new TextEncoder().encode(challenge);
        
        // Initialize WebGPU if available
        const gpu = await this.webgpuCoordinator.initializeWebGPU(this.mode, challengeBuffer);
        
        // Main mining loop
        while (this.isRunning) {
            if (gpu) {
                await this.processWebGPUStep(gpu, onProgress);
            } else {
                await this.processCPUStep(challengeBuffer, onProgress);
            }
        }

        return this.handleMiningCompletion();
    }
    
    initializeState(resumeFromSaved) {
        if (resumeFromSaved) {
            this.loadMiningProgress(); // Simply loads currentNonce from localStorage
        } else {
            // Reset state for new mining session
            this.currentNonce = 0;
            this.bestHash = '';
            this.bestNonce = 0;
            this.bestLeadingZeros = 0;
            this.gpuLastSavedNonce = 0;
        }
    }
    
    async processWebGPUStep(gpu, onProgress) {
        // FIXED: Capture values BEFORE processing to detect changes
        const previousBestHash = this.bestHash;
        const previousBestNonce = this.bestNonce;
        
        await this.webgpuCoordinator.processBatch(
            gpu, 
            this, 
            this.gpuBatchSize, 
            onProgress, 
            this.hashAnalyzer
        );
        
        // Save progress periodically - GPU mining uses different interval due to speed
        // Save every 250,000,000 nonces for GPU (vs 10,000 for CPU) due to much faster processing
        const shouldSavePeriodically = this.webgpuCoordinator.shouldSaveProgress(this.currentNonce, this.gpuLastSavedNonce, this.gpuSaveInterval);
        
        // CRITICAL FIX: Also save immediately if we found a new best hash/nonce
        const hasNewBest = (previousBestHash !== this.bestHash || previousBestNonce !== this.bestNonce) && this.bestHash && this.bestNonce > 0;
        
        if (shouldSavePeriodically || hasNewBest) {
            this.saveMiningProgress();
            this.gpuLastSavedNonce = this.currentNonce;
            
            if (hasNewBest) {
                // Log only significant improvements (every 2+ leading zeros improvement)
                if (this.bestLeadingZeros % 2 === 0 && this.bestLeadingZeros >= 26) {
                    console.log(`[GPU Mining] SAVED new best - Hash: ${this.bestHash.substring(0,10)}..., Nonce: ${this.bestNonce}, Zeros: ${this.bestLeadingZeros}`);
                }
            }
        }
    }
    
    async processCPUStep(challengeBuffer, onProgress) {
        const hash = await this.cpuMiner.step(challengeBuffer, this.currentNonce);
        this.currentHash = hash;
        
        const leadingZeroBits = this.hashAnalyzer.countLeadingZeroBits(hash);
        const isNewBest = this.hashAnalyzer.isBetterHash(leadingZeroBits, this.bestLeadingZeros, this.bestHash);
        
        if (isNewBest) {
            this.bestHash = hash;
            this.bestNonce = this.currentNonce;
            this.bestLeadingZeros = leadingZeroBits;
            // Save immediately when new best is found
            this.saveMiningProgress();
        }
        
        if (onProgress) {
            const progressReport = this.hashAnalyzer.createProgressReport(this, hash, leadingZeroBits, isNewBest);
            onProgress(progressReport);
        }
        
        this.currentNonce++;
        
        // Save progress and add small delay
        if (this.currentNonce % this.saveInterval === 0) this.saveMiningProgress();
        if (this.currentNonce % 100 === 0) await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    handleMiningCompletion() {
        if (!this.isRunning) {
            // Don't save progress here - already saved in stop() for manual stops
            // and saved periodically during mining for automatic saves
            
            if (this.bestHash) {
                const result = {
                    nonce: typeof this.bestNonce === 'bigint' ? this.bestNonce.toString() : this.bestNonce,
                    hash: this.bestHash,
                    bestHash: this.bestHash,
                    bestNonce: typeof this.bestNonce === 'bigint' ? this.bestNonce.toString() : this.bestNonce,
                    bestLeadingZeros: this.bestLeadingZeros
                };
                
                // Only save as completed result if NOT stopped manually
                if (!this.stoppedManually) {
                    this.saveMiningResult(result);
                }
                
                return result;
            }
        }
        
        return null;
    }

    stop() {
        this.isRunning = false;
        this.stoppedManually = true;
        
        // CRITICAL: Save current exact nonce when manually stopped
        this.saveMiningProgress();
    }

    async startPoW(onProgress, onComplete, resumeFromSaved = false, utxo = null) {
        // Validate that we have a UTXO
        if (!utxo) {
            throw new Error('Cannot start Proof of Work: No UTXO provided. Please ensure monitoring has found a valid UTXO first.');
        }

        // Validate UTXO structure
        if (!utxo.txid || typeof utxo.vout !== 'number' || !utxo.amount) {
            throw new Error('Invalid UTXO data provided. Required fields: txid, vout, amount');
        }

        // Store challenge components for validation
        this.challengeTxid = utxo.txid;
        this.challengeVout = utxo.vout;

        // Generate challenge from blockchain data
        const challenge = this.generateChallenge(utxo.txid, utxo.vout);

        // If not resuming from saved, clear any existing completed result
        if (!resumeFromSaved) {
            await this.clearMiningResult();
        }

        try {
            const result = await this.minePoW(challenge, onProgress, resumeFromSaved);
            if (result && onComplete) {
                onComplete(result);
            }
        } catch (error) {
            console.error('Mining error:', error);
        }
    }
}

window.BitcoinMiner = BitcoinMiner;
