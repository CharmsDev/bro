/**
 * BRO Token Mining Reward Calculator
 * Implements the exact formula from the BRO token contract
 * Formula: DENOMINATION * clz² / 2^h
 * Where clz = count of leading zero bits, h = number of halvings
 */

// Constants from BRO contract (libbro/src/calc.rs)
const DENOMINATION = 100_000_000n; // 1 BRO in satoshis
const HALVING_PERIOD_DAYS = 14n;
const SECONDS_PER_PERIOD = HALVING_PERIOD_DAYS * 24n * 3600n; // 14 days in seconds
const START_TIME = 1756830000n; // Tue Sep  2 16:20:00 UTC 2025

/**
 * Calculate the number of leading zero bits in a hash
 * @param {string} hash - The hash to analyze (hex string)
 * @returns {number} Number of leading zero bits (0-256)
 */
export function leadingZeros(hash) {
    if (!hash || typeof hash !== 'string') {
        return 0;
    }
    
    let h = hash.startsWith("0x") ? hash.slice(2) : hash;
    
    if (h.length > 64) h = h.slice(-64);
    h = h.padStart(64, "0");
    
    let leadingZeroBits = 0;
    
    for (let i = 0; i < h.length; i++) {
        const hexChar = h[i];
        const decimal = parseInt(hexChar, 16);
        
        for (let bit = 3; bit >= 0; bit--) {
            if ((decimal >> bit) & 1) {
                return leadingZeroBits;
            } else {
                leadingZeroBits++;
            }
        }
    }
    
    return leadingZeroBits;
}

/**
 * Calculate BRO token reward using the contract formula
 * @param {number} nonce - The mining nonce
 * @param {string} hash - The resulting hash
 * @param {number} blockTime - Block timestamp (default: current time)
 * @returns {bigint} Number of tokens to reward in satoshis
 */
export function reward(nonce, hash, blockTime = Math.floor(Date.now() / 1000)) {
    const clz = BigInt(leadingZeros(hash));
    const clz_pow_2 = clz * clz;
    const blockTimeBigInt = BigInt(blockTime);
    
    // Calculate number of halvings
    const timeSinceStart = blockTimeBigInt - START_TIME;
    const halvings = timeSinceStart >= 0n ? timeSinceStart / SECONDS_PER_PERIOD : 0n;
    const halving_factor = 2n ** halvings;
    
    return DENOMINATION * clz_pow_2 / halving_factor;
}

/**
 * Format token amount for display (with decimals)
 * @param {bigint} amount - Raw token amount in satoshis
 * @param {number} decimals - Number of decimal places (default 8)
 * @returns {string} Formatted token amount
 */
export function formatTokenAmount(amount, decimals = 8) {
    if (amount === 0n) return "0";

    const divisor = 10n ** BigInt(decimals);
    const whole = amount / divisor;
    const fraction = amount % divisor;

    if (fraction === 0n) {
        return whole.toString();
    }

    const fractionStr = fraction.toString().padStart(decimals, '0');
    const trimmedFraction = fractionStr.replace(/0+$/, '');

    return `${whole}.${trimmedFraction}`;
}

/**
 * Calculate and format reward for display
 * @param {number} nonce - The mining nonce
 * @param {string} hash - The resulting hash
 * @param {number} blockTime - Block timestamp (optional)
 * @returns {Object} Reward information
 */
export function calculateRewardInfo(nonce, hash, blockTime = Math.floor(Date.now() / 1000)) {
    const leadingZerosCount = leadingZeros(hash);
    const rewardAmount = reward(nonce, hash, blockTime);
    const formattedAmount = formatTokenAmount(rewardAmount);
    
    const timeSinceStart = BigInt(blockTime) - START_TIME;
    const halvings = timeSinceStart >= 0n ? timeSinceStart / SECONDS_PER_PERIOD : 0n;
    
    return {
        leadingZeros: leadingZerosCount,
        rawAmount: rewardAmount,
        formattedAmount: formattedAmount,
        nonce: nonce,
        hash: hash,
        blockTime: blockTime,
        halvings: Number(halvings),
        formula: `${DENOMINATION} * ${leadingZerosCount}² / 2^${halvings}`
    };
}

/**
 * Get detailed reward statistics
 * @param {number} nonce - The mining nonce
 * @param {string} hash - The resulting hash
 * @param {number} blockTime - Block timestamp (optional)
 * @returns {Object} Detailed reward statistics
 */
export function getRewardStats(nonce, hash, blockTime = Math.floor(Date.now() / 1000)) {
    const info = calculateRewardInfo(nonce, hash, blockTime);
    const clz = info.leadingZeros;
    const clz_pow_2 = clz * clz;
    const halving_factor = 2n ** BigInt(info.halvings);
    
    return {
        ...info,
        clz_squared: clz_pow_2,
        halving_factor: Number(halving_factor),
        denomination: Number(DENOMINATION),
        calculation: `${DENOMINATION} * ${clz}² / ${halving_factor} = ${info.rawAmount}`,
        timeInfo: {
            startTime: Number(START_TIME),
            blockTime: blockTime,
            timeSinceStart: blockTime - Number(START_TIME),
            secondsPerPeriod: Number(SECONDS_PER_PERIOD),
            halvingPeriodDays: Number(HALVING_PERIOD_DAYS)
        }
    };
}
