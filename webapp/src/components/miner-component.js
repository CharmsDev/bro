class BitcoinMiner {
    constructor() {
        this.isRunning = false;
        this.currentNonce = 0;
        this.currentHash = '';
        this.bestHash = '';
        this.bestNonce = 0;
        this.bestLeadingZeros = 0;
        this.challenge = '';
        this.saveInterval = 10000;
        this.mode = 'cpu';
        this.webgpu = null;
        this.gpuBatchSize = 256 * 256;
        this.gpuLastSavedNonce = 0;
    }

    generateChallenge(seedTxid, vout) {
        return `${seedTxid}:${vout}`;
    }

    async doubleSha256(buffer) {
        const hash1 = await crypto.subtle.digest('SHA-256', buffer);
        const hash2 = await crypto.subtle.digest('SHA-256', hash1);
        return new Uint8Array(hash2);
    }

    bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    stringToBuffer(str) {
        return new TextEncoder().encode(str);
    }

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

    saveMiningProgress() {
        const progressData = {
            nonce: this.currentNonce,
            hash: this.currentHash,
            bestHash: this.bestHash,
            bestNonce: typeof this.bestNonce === 'bigint' ? this.bestNonce.toString() : this.bestNonce,
            bestLeadingZeros: this.bestLeadingZeros,
            challenge: this.challenge,
            timestamp: Date.now()
        };
        localStorage.setItem('miningProgress', JSON.stringify(progressData));
    }

    loadMiningProgress() {
        const saved = localStorage.getItem('miningProgress');
        if (saved) {
            try {
                const progressData = JSON.parse(saved);
                this.currentNonce = progressData.nonce || 0;
                this.currentHash = progressData.hash || '';
                this.bestHash = progressData.bestHash || '';
                this.bestNonce = typeof progressData.bestNonce === 'string' ? Number(progressData.bestNonce) : (progressData.bestNonce || 0);
                this.bestLeadingZeros = progressData.bestLeadingZeros || 0;
                this.challenge = progressData.challenge || '';

                return progressData;
            } catch (error) {
                console.error('Error loading mining progress:', error);
                this.clearMiningProgress();
            }
        }
        return null;
    }

    clearMiningProgress() {
        localStorage.removeItem('miningProgress');

    }

    saveMiningResult(result) {
        const resultData = {
            nonce: typeof result.nonce === 'bigint' ? result.nonce.toString() : result.nonce,
            hash: result.hash,
            bestHash: result.bestHash,
            bestNonce: typeof result.bestNonce === 'bigint' ? result.bestNonce.toString() : result.bestNonce,
            bestLeadingZeros: result.bestLeadingZeros,
            challenge: this.challenge,
            timestamp: Date.now(),
            completed: true
        };
        localStorage.setItem('miningResult', JSON.stringify(resultData));
        this.clearMiningProgress();
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
        this.stoppedManually = false; // Track if stopped manually

        if (resumeFromSaved) {
            const savedProgress = this.loadMiningProgress();
            if (savedProgress && savedProgress.challenge === challenge) {
                this.currentNonce = savedProgress.nonce;
                this.currentHash = savedProgress.hash;
                this.bestHash = savedProgress.bestHash || '';
                this.bestNonce = savedProgress.bestNonce || 0;
                this.bestLeadingZeros = savedProgress.bestLeadingZeros || 0;
                this.gpuLastSavedNonce = this.currentNonce;
            } else {
                this.currentNonce = 0;
                this.bestHash = '';
                this.bestNonce = 0;
                this.bestLeadingZeros = 0;
                this.gpuLastSavedNonce = 0;
            }
        } else {
            this.currentNonce = 0;
            this.bestHash = '';
            this.bestNonce = 0;
            this.bestLeadingZeros = 0;
            this.gpuLastSavedNonce = 0;
        }

        const challengeBuffer = this.stringToBuffer(challenge);

        // Decide backend
        const useWebGPU = this.mode === 'webgpu' && window.WebGPUMiner && new window.WebGPUMiner().isSupported();
        let gpu = null;
        if (useWebGPU) {
            gpu = new window.WebGPUMiner();
            try {
                await gpu.init();
                gpu.setChallenge(challengeBuffer);
                console.log('[Miner] Backend: WebGPU');
            } catch (_) { gpu = null; }
        }
        if (!gpu) {
            console.log('[Miner] Backend: CPU');
        }

        const cpuStep = async () => {
            const nonceStr = this.currentNonce.toString();
            const nonceBuffer = this.stringToBuffer(nonceStr);
            const combined = new Uint8Array(challengeBuffer.length + nonceBuffer.length);
            combined.set(challengeBuffer);
            combined.set(nonceBuffer, challengeBuffer.length);
            const hashBuffer = await this.doubleSha256(combined);
            return this.bufferToHex(hashBuffer);
        };

        while (this.isRunning) {
            if (gpu) {
                // Batch compute for better throughput
                const batchSize = this.gpuBatchSize;
                const start = BigInt(this.currentNonce);
                if (gpu.setStartNonceForBatch) {
                    gpu.setStartNonceForBatch(start);
                }
                const result = await gpu.computeBatch(start, batchSize);
                const wordsPerHash = 8;
                const bestLz = result.bestLeadingZeros >>> 0;
                if (bestLz > this.bestLeadingZeros || this.bestHash === '') {
                    let hex = '';
                    for (let w = 0; w < wordsPerHash; w++) {
                        const v = result.bestWords[w] >>> 0;
                        hex += v.toString(16).padStart(8, '0');
                    }
                    this.bestHash = hex;
                    // reconstruct u64 nonce from hi/lo into JS BigInt
                    const bestNonce = (BigInt(result.bestNonceHi >>> 0) << 32n) | BigInt(result.bestNonceLo >>> 0);
                    this.bestNonce = bestNonce;
                    this.bestLeadingZeros = bestLz;
                    this.currentHash = this.bestHash;
                    if (onProgress) {
                        onProgress({
                            nonce: Number(this.bestNonce),
                            hash: this.bestHash,
                            leadingZeroBits: bestLz,
                            bestHash: this.bestHash,
                            bestNonce: this.bestNonce,
                            bestLeadingZeros: this.bestLeadingZeros,
                            isNewBest: true
                        });
                    }
                } else if (onProgress) {
                    let hex = '';
                    for (let w = 0; w < wordsPerHash; w++) {
                        const v = result.bestWords[w] >>> 0;
                        hex += v.toString(16).padStart(8, '0');
                    }
                    this.currentHash = hex;
                    onProgress({
                        nonce: this.currentNonce + batchSize - 1,
                        hash: this.currentHash,
                        leadingZeroBits: bestLz,
                        bestHash: this.bestHash,
                        bestNonce: this.bestNonce,
                        bestLeadingZeros: this.bestLeadingZeros,
                        isNewBest: false
                    });
                }
                this.currentNonce += batchSize;
                if ((this.currentNonce - this.gpuLastSavedNonce) >= this.saveInterval) {
                    this.saveMiningProgress();
                    this.gpuLastSavedNonce = this.currentNonce;
                }
            } else {
                const hash = await cpuStep();
                this.currentHash = hash;
                const leadingZeroBits = this.countLeadingZeroBits(hash);
                let isNewBest = false;
                if (leadingZeroBits > this.bestLeadingZeros || this.bestHash === '') {
                    this.bestHash = hash;
                    this.bestNonce = this.currentNonce;
                    this.bestLeadingZeros = leadingZeroBits;
                    isNewBest = true;
                }
                if (onProgress) {
                    onProgress({
                        nonce: this.currentNonce,
                        hash: hash,
                        leadingZeroBits: leadingZeroBits,
                        bestHash: this.bestHash,
                        bestNonce: this.bestNonce,
                        bestLeadingZeros: this.bestLeadingZeros,
                        isNewBest: isNewBest
                    });
                }
                this.currentNonce++;
                if (this.currentNonce % this.saveInterval === 0) this.saveMiningProgress();
                if (this.currentNonce % 100 === 0) await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        // When stopped, only save progress (not result) if stopped manually
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
        this.stoppedManually = true; // Mark as manually stopped
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
