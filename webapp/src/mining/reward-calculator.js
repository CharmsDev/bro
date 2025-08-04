/**
 * Mining Reward Calculator
 * Calculates token rewards based on proof of work (leading zeros in hash)
 */

// Total supply constant
const S = 69_420_000_000n;

/**
 * Calculate the number of leading zeros in a hash
 * @param {string|Uint8Array} hash - The hash to analyze
 * @returns {number} Number of leading zeros (0-256)
 */
export function leadingZeros(hash) {
    let x;

    if (typeof hash === "string") {
        let h = hash.startsWith("0x") ? hash.slice(2) : hash;
        if (h.length > 64) h = h.slice(-64);
        x = BigInt("0x" + h.padStart(64, "0"));
    } else {
        x = hash.reduce((acc, b) => (acc << 8n) | BigInt(b), 0n);
    }

    if (x === 0n) return 256;
    const bits = x.toString(2).length;
    return 256 - bits;
}

/**
 * Calculate token reward based on nonce and hash
 * @param {bigint} nonce - The mining nonce
 * @param {string|Uint8Array} hash - The resulting hash
 * @returns {bigint} Number of tokens to reward
 */
export function reward(nonce, hash) {
    const lz = leadingZeros(hash);                    // 0..256
    const sh = BigInt(Math.max(0, 30 - lz));          // logarithmic shift based on leading zeros
    return S >> sh;                                   // tokens
}

/**
 * Format token amount for display (with decimals)
 * @param {bigint} amount - Raw token amount
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
 * @param {number} nonce - The mining nonce (as number)
 * @param {string} hash - The resulting hash
 * @returns {Object} Reward information
 */
export function calculateRewardInfo(nonce, hash) {
    const nonceBigInt = BigInt(nonce);
    const leadingZerosCount = leadingZeros(hash);
    const rewardAmount = reward(nonceBigInt, hash);
    const formattedAmount = formatTokenAmount(rewardAmount);

    const result = {
        leadingZeros: leadingZerosCount,
        rawAmount: rewardAmount,
        formattedAmount: formattedAmount,
        nonce: nonce,
        hash: hash
    };

    return result;
}

/**
 * Get reward statistics for debugging
 * @param {number} nonce - The mining nonce
 * @param {string} hash - The resulting hash
 * @returns {Object} Detailed reward statistics
 */
export function getRewardStats(nonce, hash) {
    const info = calculateRewardInfo(nonce, hash);
    const shift = Math.max(0, 30 - info.leadingZeros);

    return {
        ...info,
        shift: shift,
        totalSupply: S.toString(),
        formula: `S >> (30 - leadingZeros)`,
        calculation: `${S.toString()} >> ${shift} = ${info.rawAmount.toString()}`
    };
}
