import { MiningValidator } from '../utils/mining-validator.js';
import { CPUMiner } from './cpu-miner.js';
import { MiningPersistence } from './mining-persistence.js';
import { MiningHashAnalyzer } from './mining-hash-analyzer.js';
import { WebGPUCoordinator } from './webgpu-coordinator.js';

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
        this.saveInterval = 10000;
        this.mode = 'cpu';
        this.gpuBatchSize = 256 * 256;
        this.gpuLastSavedNonce = 0;
        
        // Challenge info
        this.challengeTxid = '';
        this.challengeVout = 0;
        this.validationResults = null;
        
        // Helper instances
        this.persistence = new MiningPersistence();
        this.hashAnalyzer = new MiningHashAnalyzer();
        this.webgpuCoordinator = new WebGPUCoordinator();
        this.cpuMiner = new CPUMiner();
    }

    generateChallenge(seedTxid, vout) {
        return `${seedTxid}:${vout}`;
    }



    // Delegate to persistence helper
    saveMiningProgress() {
        this.persistence.saveProgress(this);
    }

    loadMiningProgress() {
        const progressData = this.persistence.loadProgress();
        if (progressData && progressData.challenge === this.challenge) {
            this.currentNonce = progressData.nonce;
            this.currentHash = progressData.hash;
            this.bestHash = progressData.bestHash;
            this.bestNonce = progressData.bestNonce;
            this.bestLeadingZeros = progressData.bestLeadingZeros;
            return progressData;
        }
        return null;
    }

    clearMiningProgress() {
        this.persistence.clearProgress();
    }

    saveMiningResult(result) {
        const challengeInfo = {
            challenge: this.challenge,
            challengeTxid: this.challengeTxid,
            challengeVout: this.challengeVout
        };
        this.persistence.saveResult(result, challengeInfo);
    }

    loadMiningResult() {
        return this.persistence.loadResult();
    }

    clearMiningResult() {
        this.persistence.clearResult();
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
            const savedProgress = this.loadMiningProgress();
            if (savedProgress) {
                this.currentNonce = savedProgress.nonce;
                this.currentHash = savedProgress.hash;
                this.bestHash = savedProgress.bestHash || '';
                this.bestNonce = savedProgress.bestNonce || 0;
                this.bestLeadingZeros = savedProgress.bestLeadingZeros || 0;
                this.gpuLastSavedNonce = this.currentNonce;
                return;
            }
        }
        
        // Reset state for new mining session
        this.currentNonce = 0;
        this.bestHash = '';
        this.bestNonce = 0;
        this.bestLeadingZeros = 0;
        this.gpuLastSavedNonce = 0;
    }
    
    async processWebGPUStep(gpu, onProgress) {
        await this.webgpuCoordinator.processBatch(
            gpu, 
            this, 
            this.gpuBatchSize, 
            onProgress, 
            this.hashAnalyzer
        );
        
        // Save progress periodically
        if (this.webgpuCoordinator.shouldSaveProgress(this.currentNonce, this.gpuLastSavedNonce, this.saveInterval)) {
            this.saveMiningProgress();
            this.gpuLastSavedNonce = this.currentNonce;
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
            this.saveMiningProgress();
            
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
            this.clearMiningResult();
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
