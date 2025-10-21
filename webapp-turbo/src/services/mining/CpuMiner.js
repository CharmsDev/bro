// Dedicated CPU miner implementation
// Provides the hashing step used by the mining orchestrator

export class CpuMiner {
    constructor() {
        this.textEncoder = new TextEncoder();
    }

    stringToBuffer(str) {
        return this.textEncoder.encode(str);
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

    // Perform one CPU step: hash(challenge || nonce)
    // Inputs:
    //  - challengeBuffer: Uint8Array
    //  - nonce: number
    // Returns hex string
    async step(challengeBuffer, nonce) {
        const nonceStr = nonce.toString();
        const nonceBuffer = this.stringToBuffer(nonceStr);
        const combined = new Uint8Array(challengeBuffer.length + nonceBuffer.length);
        combined.set(challengeBuffer);
        combined.set(nonceBuffer, challengeBuffer.length);
        const hashBuffer = await this.doubleSha256(combined);
        return this.bufferToHex(hashBuffer);
    }
}
