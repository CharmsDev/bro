// Bitcoin PoW Mining functionality adapted for browser
class BitcoinMiner {
    constructor() {
        this.isRunning = false;
        this.currentNonce = 0;
        this.currentHash = '';
        this.difficulty = 4;
        this.challenge = '';
        this.saveInterval = 10000; // Save progress every 10,000 nonces
    }

    // Generate challenge from mock UTXO data
    generateChallenge(seedTxid, vout) {
        return `${seedTxid}:${vout}`;
    }

    // Double SHA256 hash using Web Crypto API
    async doubleSha256(buffer) {
        const hash1 = await crypto.subtle.digest('SHA-256', buffer);
        const hash2 = await crypto.subtle.digest('SHA-256', hash1);
        return new Uint8Array(hash2);
    }

    // Convert buffer to hex string
    bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Convert string to buffer
    stringToBuffer(str) {
        return new TextEncoder().encode(str);
    }

    // Save mining progress to localStorage
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

    // Load mining progress from localStorage
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

    // Clear mining progress from localStorage
    clearMiningProgress() {
        localStorage.removeItem('miningProgress');
        console.log('Mining progress cleared');
    }

    // Save completed mining result
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
        this.clearMiningProgress(); // Clear progress since we're done
        console.log('Mining result saved:', result);
    }

    // Load completed mining result
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

    // Clear mining result from localStorage
    clearMiningResult() {
        localStorage.removeItem('miningResult');
        console.log('Mining result cleared');
    }

    // Mine proof of work with visual updates
    async minePoW(challenge, difficulty, onProgress, resumeFromSaved = false) {
        this.isRunning = true;
        this.challenge = challenge;
        this.difficulty = difficulty;

        // Load previous progress if resuming
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

            // Calculate hash
            const hashBuffer = await this.doubleSha256(combined);
            const hash = this.bufferToHex(hashBuffer);

            this.currentHash = hash;

            // Update UI
            if (onProgress) {
                onProgress({
                    nonce: this.currentNonce,
                    hash: hash,
                    found: hash.startsWith(target)
                });
            }

            // Check if we found a valid hash
            if (hash.startsWith(target)) {
                this.isRunning = false;
                const result = { nonce: this.currentNonce, hash: hash };
                this.saveMiningResult(result);
                return result;
            }

            this.currentNonce++;

            // Save progress every saveInterval nonces
            if (this.currentNonce % this.saveInterval === 0) {
                this.saveMiningProgress();
            }

            // Yield control to prevent blocking UI
            if (this.currentNonce % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        // Save progress when stopped
        if (!this.isRunning) {
            this.saveMiningProgress();
        }

        return null;
    }

    // Stop mining
    stop() {
        this.isRunning = false;
    }

    // Generate mock UTXO for demo
    generateMockUTXO() {
        return {
            txid: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
            vout: 0,
            scriptPubKey: '76a914' + '0'.repeat(40) + '88ac',
            amount: 100000
        };
    }

    // Create demo mining session
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

// Export for use in other scripts
window.BitcoinMiner = BitcoinMiner;
