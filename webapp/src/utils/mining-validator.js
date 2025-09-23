/**
 * Mining Validator - JavaScript implementation of the Rust contract validation logic
 * Validates nonce and hash calculations for BRO token mining
 */

import { sha256 } from '@noble/hashes/sha256';

export class MiningValidator {
    /**
     * Validates a nonce for mining difficulty (leading zero bits)
     * CORRECTED: Mining validation is about difficulty, NOT matching transaction hash
     * The Rust contract validates:
     * 1. compute_mining_hash(challenge_txid, challenge_vout, nonce)
     * 2. count_leading_zero_bits(&hash_bytes) >= required_difficulty
     * @param {string} challengeUtxo - The UTXO in format "txid:vout"
     * @param {number} nonce - The nonce to validate
     * @param {number} requiredZeroBits - Minimum required leading zero bits for difficulty
     * @returns {object} Validation result with details
     */
    static validateNonce(challengeUtxo, nonce, requiredZeroBits = 0) {
        try {
            // Use the exact same format as Rust: challengeUtxo + nonce (as string)
            const hashInput = challengeUtxo + nonce.toString();
            console.log(`[MiningValidator] Hash input: ${hashInput}`);
            
            const computedHash = this.doubleSha256(hashInput);
            const leadingZeroBits = this.countLeadingZeroBits(this.hexToBytes(computedHash));
            const meetsdifficulty = leadingZeroBits >= requiredZeroBits;
            
            return {
                valid: meetsdifficulty,
                details: {
                    computedHash,
                    leadingZeroBits,
                    requiredZeroBits,
                    meetsdifficulty,
                    hashInput
                }
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message,
                details: null
            };
        }
    }



    /**
     * Double SHA256 hash function (same as Rust implementation)
     */
    static doubleSha256(data) {
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(data);
        const firstHash = sha256(dataBytes);
        const secondHash = sha256(firstHash);
        return this.bytesToHex(secondHash);
    }

    /**
     * Count leading zero bits (same logic as Rust)
     */
    static countLeadingZeroBits(data) {
        for (let i = 0; i < data.length; i++) {
            if (data[i] !== 0) {
                // Found first non-zero byte, count leading zeros in this byte
                return i * 8 + this.countLeadingZerosInByte(data[i]);
            }
        }
        // All bytes are zero
        return data.length * 8;
    }

    /**
     * Count leading zeros in a single byte
     */
    static countLeadingZerosInByte(byte) {
        if (byte === 0) return 8;
        let count = 0;
        for (let i = 7; i >= 0; i--) {
            if ((byte >> i) & 1) break;
            count++;
        }
        return count;
    }

    /**
     * Calculate mined amount based on block time and zero bits
     * Replicates the Rust calc.rs logic
     */
    static calculateMinedAmount(blockTime, clz) {
        const DENOMINATION = 100_000_000;
        const HALVING_PERIOD_DAYS = 14;
        const SECONDS_PER_PERIOD = HALVING_PERIOD_DAYS * 24 * 3600;
        const START_TIME = 1756830000; // Tue Sep 2 16:20:00 UTC 2025

        const adjustedBlockTime = blockTime < START_TIME ? START_TIME : blockTime;
        const clzPow2 = clz * clz;
        const halvingFactor = Math.pow(2, Math.floor((adjustedBlockTime - START_TIME) / SECONDS_PER_PERIOD));
        
        return Math.floor(DENOMINATION * clzPow2 / halvingFactor);
    }

    /**
     * Validates UTXO identity hash (for NFT contract validation)
     * Replicates the hash function from contract/src/lib.rs
     */
    static validateUtxoIdentity(utxoId, expectedIdentity) {
        try {
            const computedHash = this.hashUtxoId(utxoId);
            const matches = computedHash === expectedIdentity.toLowerCase();
            
            return {
                success: matches,
                details: {
                    utxoId,
                    computedHash,
                    expectedIdentity: expectedIdentity.toLowerCase(),
                    matches
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                details: null
            };
        }
    }

    /**
     * Hash UTXO ID using SHA256 (same as Rust contract)
     */
    static hashUtxoId(utxoId) {
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(utxoId);
        const hash = sha256(dataBytes);
        return this.bytesToHex(hash);
    }

    /**
     * Convert byte array to hex string
     */
    static bytesToHex(bytes) {
        return Array.from(bytes)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Convert hex string to byte array
     */
    static hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
    }

    /**
     * Format hash with leading zeros highlighted (like web interface)
     */
    static formatHashWithLeadingZeros(hash) {
        const leadingZeros = hash.match(/^0*/)[0];
        const rest = hash.substring(leadingZeros.length);
        return {
            leadingZeros,
            rest,
            formatted: `${leadingZeros}${rest}`,
            zeroCount: leadingZeros.length
        };
    }

    /**
     * Test a nonce and display results like the web interface
     */
    static testNonceWithDisplay(challengeUtxo, nonce, description = '') {
        const result = this.validateNonce(challengeUtxo, nonce, 0);
        
        if (result.details) {
            const hashFormat = this.formatHashWithLeadingZeros(result.details.computedHash);
            
            console.log(`\n🔍 ${description}`);
            console.log(`Nonce: ${nonce.toLocaleString()}`);
            console.log(`Hash: ${hashFormat.formatted}`);
            console.log(`Leading zeros: ${hashFormat.zeroCount} (${result.details.leadingZeroBits} bits)`);
            
            if (hashFormat.zeroCount >= 5) {
                console.log('🏆 EXCELLENT! 5+ leading zeros - high difficulty!');
            } else if (hashFormat.zeroCount >= 3) {
                console.log('✅ GOOD! 3+ leading zeros - medium difficulty');
            } else if (hashFormat.zeroCount >= 1) {
                console.log('👍 OK! Some leading zeros - low difficulty');
            } else {
                console.log('📝 No leading zeros - minimal difficulty');
            }
        }
        
        return result;
    }

    /**
     * Comprehensive validation that checks both mining difficulty and UTXO identity
     */
    static validateComplete(challengeUtxo, nonce, requiredZeroBits, expectedIdentity = null) {
        const miningValidation = this.validateNonce(challengeUtxo, nonce, requiredZeroBits);
        
        let identityValidation = null;
        if (expectedIdentity) {
            identityValidation = this.validateUtxoIdentity(challengeUtxo, expectedIdentity);
        }

        return {
            success: miningValidation.valid && (identityValidation ? identityValidation.success : true),
            mining: miningValidation,
            identity: identityValidation
        };
    }
}

export default MiningValidator;
