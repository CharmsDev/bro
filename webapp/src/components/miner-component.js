class BitcoinMiner {
    constructor() {
        this.isRunning = false;
        this.currentNonce = 0;
        this.currentHash = '';
        this.difficulty = 4;
        this.challenge = '';
        this.saveInterval = 10000;
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

    saveMiningProgress() {
        const progressData = {
            nonce: this.currentNonce,
            hash: this.currentHash,
            challenge: this.challenge,
            difficulty: this.difficulty,
            timestamp: Date.now()
        };
        localStorage.setItem('miningProgress', JSON.stringify(progressData));
        console.log(`Mining progress saved at nonce: ${this.currentNonce}`);
    }

    loadMiningProgress() {
        const saved = localStorage.getItem('miningProgress');
        if (saved) {
            try {
                const progressData = JSON.parse(saved);
                this.currentNonce = progressData.nonce || 0;
                this.currentHash = progressData.hash || '';
                this.challenge = progressData.challenge || '';
                this.difficulty = progressData.difficulty || 4;
                console.log(`Mining progress loaded from nonce: ${this.currentNonce}`);
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
        console.log('Mining progress cleared');
    }

    saveMiningResult(result) {
        const resultData = {
            nonce: result.nonce,
            hash: result.hash,
            challenge: this.challenge,
            difficulty: this.difficulty,
            timestamp: Date.now(),
            completed: true
        };
        localStorage.setItem('miningResult', JSON.stringify(resultData));
        this.clearMiningProgress();
        console.log('Mining result saved:', result);
    }

    loadMiningResult() {
        const saved = localStorage.getItem('miningResult');
        if (saved) {
            try {
                const resultData = JSON.parse(saved);
                if (resultData.completed) {
                    console.log('Mining result loaded:', resultData);
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
        console.log('Mining result cleared');
    }

    async minePoW(challenge, difficulty, onProgress, resumeFromSaved = false) {
        this.isRunning = true;
        this.challenge = challenge;
        this.difficulty = difficulty;

        if (resumeFromSaved) {
            const savedProgress = this.loadMiningProgress();
            if (savedProgress && savedProgress.challenge === challenge) {
                this.currentNonce = savedProgress.nonce;
                this.currentHash = savedProgress.hash;
                console.log(`Resuming mining from nonce: ${this.currentNonce}`);
            } else {
                this.currentNonce = 0;
            }
        } else {
            this.currentNonce = 0;
        }

        const target = '0'.repeat(difficulty);
        const challengeBuffer = this.stringToBuffer(challenge);

        while (this.isRunning) {
            const nonceStr = this.currentNonce.toString();
            const nonceBuffer = this.stringToBuffer(nonceStr);

            // Combine challenge and nonce
            const combined = new Uint8Array(challengeBuffer.length + nonceBuffer.length);
            combined.set(challengeBuffer);
            combined.set(nonceBuffer, challengeBuffer.length);

            const hashBuffer = await this.doubleSha256(combined);
            const hash = this.bufferToHex(hashBuffer);

            this.currentHash = hash;

            if (onProgress) {
                onProgress({
                    nonce: this.currentNonce,
                    hash: hash,
                    found: hash.startsWith(target)
                });
            }

            if (hash.startsWith(target)) {
                this.isRunning = false;
                const result = { nonce: this.currentNonce, hash: hash };
                this.saveMiningResult(result);
                return result;
            }

            this.currentNonce++;

            // Periodic progress save
            if (this.currentNonce % this.saveInterval === 0) {
                this.saveMiningProgress();
            }

            // Yield control to prevent UI blocking
            if (this.currentNonce % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        if (!this.isRunning) {
            this.saveMiningProgress();
        }

        return null;
    }

    stop() {
        this.isRunning = false;
    }

    generateMockUTXO() {
        return {
            txid: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
            vout: 0,
            scriptPubKey: '76a914' + '0'.repeat(40) + '88ac',
            amount: 100000
        };
    }

    async startDemo(onProgress, onComplete, resumeFromSaved = false) {
        const mockUtxo = this.generateMockUTXO();
        const challenge = this.generateChallenge(mockUtxo.txid, mockUtxo.vout);

        console.log('Starting mining demo...');
        console.log('Challenge:', challenge);
        console.log('Difficulty:', this.difficulty);
        if (resumeFromSaved) {
            console.log('Attempting to resume from saved progress...');
        }

        try {
            const result = await this.minePoW(challenge, this.difficulty, onProgress, resumeFromSaved);
            if (result && onComplete) {
                onComplete(result);
            }
        } catch (error) {
            console.error('Mining error:', error);
        }
    }
}

window.BitcoinMiner = BitcoinMiner;
