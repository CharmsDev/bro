// Bitcoin PoW Mining functionality adapted for browser
class BitcoinMiner {
    constructor() {
        this.isRunning = false;
        this.currentNonce = 0;
        this.currentHash = '';
        this.difficulty = 4;
        this.challenge = '';
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

    // Mine proof of work with visual updates
    async minePoW(challenge, difficulty, onProgress) {
        this.isRunning = true;
        this.currentNonce = 0;
        this.challenge = challenge;
        this.difficulty = difficulty;

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
                return { nonce: this.currentNonce, hash: hash };
            }

            this.currentNonce++;

            // Yield control to prevent blocking UI
            if (this.currentNonce % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
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
    async startDemo(onProgress, onComplete) {
        const mockUtxo = this.generateMockUTXO();
        const challenge = this.generateChallenge(mockUtxo.txid, mockUtxo.vout);

        console.log('Starting mining demo...');
        console.log('Challenge:', challenge);
        console.log('Difficulty:', this.difficulty);

        try {
            const result = await this.minePoW(challenge, this.difficulty, onProgress);
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
