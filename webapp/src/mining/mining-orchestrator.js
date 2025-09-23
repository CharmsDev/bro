import { MiningValidator } from '../utils/mining-validator.js';
import { CPUMiner } from './cpu-miner.js';
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
        this.saveInterval = 10000; // CPU mining: save every 10,000 nonces
        this.gpuSaveInterval = 100000000; // GPU mining: save every 100,000,000 nonces
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
    saveMiningProgress() {
        localStorage.setItem('current11', this.currentNonce.toString());
        if (this.bestHash) {
            localStorage.setItem('bestHash11', this.bestHash);
            localStorage.setItem('bestNonce11', this.bestNonce.toString());
            localStorage.setItem('bestZeros11', this.bestLeadingZeros.toString());
        }
    }

    loadMiningProgress() {
        const savedNonce = localStorage.getItem('current11');
        const savedBestHash = localStorage.getItem('bestHash11');
        const savedBestNonce = localStorage.getItem('bestNonce11');
        const savedBestZeros = localStorage.getItem('bestZeros11');
        
        
        if (savedNonce) {
            this.currentNonce = parseInt(savedNonce, 10) || 0;
            this.bestHash = savedBestHash || '';
            this.bestNonce = parseInt(savedBestNonce, 10) || 0;
            this.bestLeadingZeros = parseInt(savedBestZeros, 10) || 0;
            
            return {
                nonce: this.currentNonce,
                bestHash: this.bestHash,
                bestNonce: this.bestNonce,
                bestLeadingZeros: this.bestLeadingZeros
            };
        }
        this.currentNonce = 0;
        this.bestHash = '';
        this.bestNonce = 0;
        this.bestLeadingZeros = 0;
        return null;
    }

    clearMiningProgress() {
        localStorage.removeItem('current11');
        localStorage.removeItem('bestHash11');
        localStorage.removeItem('bestNonce11');
        localStorage.removeItem('bestZeros11');
        this.currentNonce = 0;
        this.bestHash = '';
        this.bestNonce = 0;
        this.bestLeadingZeros = 0;
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

    loadMiningResult() {
        const saved = localStorage.getItem('miningResult');
        if (saved) {
            try {
                const resultData = JSON.parse(saved);
                if (resultData.completed) {
                    return resultData;
                }
            } catch (error) {
                console.error('Error loading mining result:', error);
                this.clearMiningResult();
            }
        }
        return null;
    }

    clearMiningResult() {
        localStorage.removeItem('miningResult');
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
        // Save every 100,000,000 nonces for GPU (vs 10,000 for CPU) due to much faster processing
        const shouldSavePeriodically = this.webgpuCoordinator.shouldSaveProgress(this.currentNonce, this.gpuLastSavedNonce, this.gpuSaveInterval);
        
        // CRITICAL FIX: Also save immediately if we found a new best hash/nonce
        const hasNewBest = (previousBestHash !== this.bestHash || previousBestNonce !== this.bestNonce) && this.bestHash && this.bestNonce > 0;
        
        if (shouldSavePeriodically || hasNewBest) {
            this.saveMiningProgress();
            this.gpuLastSavedNonce = this.currentNonce;
            
            if (hasNewBest) {
                console.log(`[GPU Mining] SAVED new best immediately - Hash: ${this.bestHash.substring(0,10)}..., Nonce: ${this.bestNonce}`);
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
