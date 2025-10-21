// Bitcoin proof-of-work mining orchestrator adapted for React
import { CpuMiner } from './CpuMiner.js';
import { WebGPUCoordinator } from './WebGpuCoordinator.js';
import { calculateRewardInfo } from './RewardCalculator.js';
import { MiningPersistence } from './MiningPersistence.js';
import { CpuMiningStrategy } from './strategies/CpuMiningStrategy.js';
import { GpuMiningStrategy } from './strategies/GpuMiningStrategy.js';

export class MiningOrchestrator {
    constructor() {
        this.isRunning = false;
        this.currentNonce = 0;
        this.currentHash = '';
        this.bestHash = '';
        this.bestNonce = 0;
        this.bestLeadingZeros = 0;
        this.challenge = '';
        this.challengeTxid = '';
        this.challengeVout = 0;
        this.stoppedManually = false;
        this.mode = 'cpu';
        
        this.cpuMiner = new CpuMiner();
        this.webGpuCoordinator = new WebGPUCoordinator();
        
        this.onProgressUpdate = null;
        this.onBestHashUpdate = null;
        this.onStatusUpdate = null;
        
        // Load saved state immediately on construction
        this.loadSavedState();
    }
    
    loadSavedState() {
        const mode = MiningPersistence.loadMode();
        if (mode) {
            this.mode = mode;
        }
    }

    setupChallenge(utxo) {
        this.challengeTxid = utxo.txid;
        this.challengeVout = utxo.vout;
        this.challenge = `${utxo.txid}:${utxo.vout}`;
        return this.challenge;
    }

    async startMining(utxo, callbacks = {}) {
        if (this.isRunning) return;

        this.onProgressUpdate = callbacks.onProgressUpdate;
        this.onBestHashUpdate = callbacks.onBestHashUpdate;
        this.onStatusUpdate = callbacks.onStatusUpdate;

        this.setupChallenge(utxo);
        this.loadMiningProgress();
        
        this.isRunning = true;
        this.stoppedManually = false;
        
        this.notifyStatus('starting', `Starting ${this.mode.toUpperCase()} mining...`);
        
        await (this.mode === 'gpu' ? this.runGpuMining() : this.runCpuMining());
    }

    async stopMining() {
        if (!this.isRunning) return null;

        this.isRunning = false;
        this.stoppedManually = true;
        
        await new Promise(resolve => setTimeout(resolve, 100));
        this.saveMiningProgress();
        this.notifyStatus('stopped', 'Mining stopped');

        return this.getMiningResult();
    }

    // Helper: Check if hash is better than current best
    isBetterHash(hash, leadingZerosCount) {
        return leadingZerosCount > this.bestLeadingZeros ||
            (leadingZerosCount === this.bestLeadingZeros && this.bestHash === '') ||
            (leadingZerosCount === this.bestLeadingZeros && this.bestHash !== '' &&
             BigInt('0x' + hash) < BigInt('0x' + this.bestHash));
    }

    // Helper: Handle new best hash found
    handleBestHashFound(hash, nonce, leadingZerosCount) {
        this.bestHash = hash;
        this.bestNonce = nonce;
        this.bestLeadingZeros = leadingZerosCount;
        this.saveMiningProgress();
        
        if (this.onBestHashUpdate) {
            this.onBestHashUpdate({
                hash,
                nonce,
                leadingZeros: leadingZerosCount,
                rewardInfo: calculateRewardInfo(nonce, hash)
            });
        }
    }

    // Helper: Notify status change
    notifyStatus(status, message) {
        if (this.onStatusUpdate) {
            this.onStatusUpdate({ status, message, mode: this.mode });
        }
    }

    // Helper: Notify progress update (converts BigInt to Number for store)
    notifyProgress(data) {
        if (this.onProgressUpdate) {
            this.onProgressUpdate({
                ...data,
                currentNonce: typeof data.currentNonce === 'bigint' ? Number(data.currentNonce) : data.currentNonce,
                bestNonce: typeof data.bestNonce === 'bigint' ? Number(data.bestNonce) : data.bestNonce
            });
        }
    }

    // CPU mining loop
    async runCpuMining() {
        const state = {
            currentNonce: this.currentNonce,
            currentHash: this.currentHash,
            bestHash: this.bestHash,
            bestNonce: this.bestNonce,
            bestLeadingZeros: this.bestLeadingZeros
        };

        await CpuMiningStrategy.run({
            cpuMiner: this.cpuMiner,
            challenge: this.challenge,
            state,
            isRunning: () => this.isRunning,
            isBetterHash: (hash, lz) => this.isBetterHash(hash, lz),
            onBestHashFound: (hash, nonce, lz) => this.handleBestHashFound(hash, nonce, lz),
            onProgress: (data) => this.notifyProgress(data),
            onStatusUpdate: (status, message) => this.notifyStatus(status, message)
        });

        // Sync state back
        this.currentNonce = state.currentNonce;
        this.currentHash = state.currentHash;

        if (!this.stoppedManually) {
            this.notifyStatus('completed', 'Mining completed');
        }
    }

    getMiningResult() {
        if (!this.bestHash) return null;
        
        return {
            nonce: this.bestNonce,
            hash: this.bestHash,
            bestHash: this.bestHash,
            bestNonce: this.bestNonce,
            bestLeadingZeros: this.bestLeadingZeros,
            currentNonce: this.currentNonce,
            challenge: this.challenge,
            challengeTxid: this.challengeTxid,
            challengeVout: this.challengeVout,
            rewardInfo: calculateRewardInfo(this.bestNonce, this.bestHash),
            timestamp: Date.now(),
            completed: true
        };
    }

    saveMiningProgress() {
        MiningPersistence.save(this);
    }

    loadMiningProgress() {
        const data = MiningPersistence.load();
        
        if (data) {
            this.currentNonce = data.currentNonce;
            this.bestHash = data.bestHash;
            this.bestNonce = data.bestNonce;
            this.bestLeadingZeros = data.bestLeadingZeros;
            this.mode = data.mode;
            this.challenge = data.challenge;
            this.challengeTxid = data.challengeTxid;
            this.challengeVout = data.challengeVout;
            
            this.notifyProgress({
                currentNonce: this.currentNonce,
                currentHash: this.currentHash,
                bestHash: this.bestHash,
                bestNonce: this.bestNonce,
                bestLeadingZeros: this.bestLeadingZeros,
                hashRate: 0,
                elapsed: 0
            });
        }
        
        return data;
    }

    clearMiningProgress() {
        MiningPersistence.clear();
        
        this.currentNonce = 0;
        this.currentHash = '';
        this.bestHash = '';
        this.bestNonce = 0;
        this.bestLeadingZeros = 0;
        this.challenge = '';
        this.challengeTxid = '';
        this.challengeVout = 0;
    }

    setMode(mode) {
        if (this.isRunning) return false;
        
        this.mode = mode;
        
        this.saveMiningProgress();
        
        return true;
    }

    getStats() {
        return {
            isRunning: this.isRunning,
            mode: this.mode,
            currentNonce: this.currentNonce,
            currentHash: this.currentHash,
            bestHash: this.bestHash,
            bestNonce: this.bestNonce,
            bestLeadingZeros: this.bestLeadingZeros,
            challenge: this.challenge,
            hasResult: !!this.bestHash
        };
    }

    // GPU mining loop using WebGPU
    async runGpuMining() {
        const state = {
            currentNonce: this.currentNonce,
            currentHash: this.currentHash,
            bestHash: this.bestHash,
            bestNonce: this.bestNonce,
            bestLeadingZeros: this.bestLeadingZeros,
            challenge: this.challenge
        };

        await GpuMiningStrategy.run({
            webGpuCoordinator: this.webGpuCoordinator,
            challenge: this.challenge,
            state,
            isRunning: () => this.isRunning,
            isStopped: () => this.stoppedManually,
            onBestHashFound: (hash, nonce, lz) => this.handleBestHashFound(hash, nonce, lz),
            onProgress: (data) => this.notifyProgress(data),
            onStatusUpdate: (status, message) => this.notifyStatus(status, message),
            fallbackToCpu: async () => {
                this.mode = 'cpu';
                await this.runCpuMining();
            }
        });

        // Sync state back
        this.currentNonce = state.currentNonce;
        this.currentHash = state.currentHash;
        this.bestHash = state.bestHash;
        this.bestNonce = state.bestNonce;
        this.bestLeadingZeros = state.bestLeadingZeros;
    }
}
