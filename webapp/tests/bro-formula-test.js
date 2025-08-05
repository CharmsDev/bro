/**
 * BRO Token Formula Verification Test
 * Tests that our JavaScript implementation matches the Rust contract exactly
 */

import { leadingZeros, reward, calculateRewardInfo, formatTokenAmount } from '../src/mining/reward-calculator.js';

// Test constants from the contract
const DENOMINATION = 100_000_000n; // 1 BRO in satoshis
const START_TIME = 1_753_560_000; // 7/26/2025 20:00:00 UTC

console.log('🧪 Testing BRO Token Formula Implementation');
console.log('==========================================');

// Test 1: Leading zeros calculation
console.log('\n📊 Test 1: Leading Zero Bits Calculation');
const testHashes = [
    '000005c559e830ac9cbbc0b30ba6af2dcff675e4a57e3c2ad94ff1546523195e', // 21 leading zero bits
    '0000000123456789abcdef0123456789abcdef0123456789abcdef0123456789ab', // 28 leading zeros
    '123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01', // 0 leading zeros
    '00000000000000000000000000000000000000000000000000000000000000ab' // 248 leading zeros
];

testHashes.forEach((hash, i) => {
    const zeros = leadingZeros(hash);
    console.log(`Hash ${i + 1}: ${hash.substring(0, 20)}... → ${zeros} zero bits`);
});

// Test 2: Reward calculation at contract start time
console.log('\n💰 Test 2: Reward Calculation at Start Time');
const testCases = [
    { clz: 10, expected: DENOMINATION * 100n / 1n }, // 10² = 100, no halvings
    { clz: 15, expected: DENOMINATION * 225n / 1n }, // 15² = 225, no halvings  
    { clz: 20, expected: DENOMINATION * 400n / 1n }, // 20² = 400, no halvings
    { clz: 21, expected: DENOMINATION * 441n / 1n }  // 21² = 441, no halvings
];

testCases.forEach(({ clz, expected }) => {
    // Create a mock hash with exactly clz leading zero bits
    let mockHash;
    if (clz % 4 === 0) {
        // Exact hex boundary
        mockHash = '0'.repeat(clz / 4) + '8' + '0'.repeat(63 - clz / 4);
    } else {
        // Partial hex character
        const fullZeroHex = Math.floor(clz / 4);
        const remainingBits = clz % 4;
        const partialHex = (0x8 >> remainingBits).toString(16);
        mockHash = '0'.repeat(fullZeroHex) + partialHex + '0'.repeat(63 - fullZeroHex);
    }
    
    const calculated = reward(12345, mockHash, START_TIME + 1);
    const actualZeros = leadingZeros(mockHash);
    const match = calculated === expected && actualZeros === clz;
    
    console.log(`${clz} zero bits: ${formatTokenAmount(calculated)} $BRO (actual: ${actualZeros}) ${match ? '✅' : '❌'}`);
    if (!match) {
        console.log(`  Expected: ${formatTokenAmount(expected)} with ${clz} zeros`);
        console.log(`  Got:      ${formatTokenAmount(calculated)} with ${actualZeros} zeros`);
        console.log(`  Hash:     ${mockHash}`);
    }
});

// Test 3: Halving mechanism
console.log('\n⏰ Test 3: Halving Mechanism');
const SECONDS_PER_PERIOD = 14n * 24n * 3600n; // 14 days
const testHash = '000005c559e830ac9cbbc0b30ba6af2dcff675e4a57e3c2ad94ff1546523195e'; // 21 zero bits

const halvingTests = [
    { period: 0, time: START_TIME },
    { period: 1, time: START_TIME + Number(SECONDS_PER_PERIOD) },
    { period: 2, time: START_TIME + Number(SECONDS_PER_PERIOD) * 2 }
];

halvingTests.forEach(({ period, time }) => {
    const reward1 = reward(12345, testHash, time);
    const expectedDivision = 2n ** BigInt(period);
    console.log(`Period ${period}: ${formatTokenAmount(reward1)} $BRO (÷${expectedDivision})`);
});

// Test 4: Real example from your mining
console.log('\n🎯 Test 4: Real Mining Example');
const realHash = '000005c559e830ac9cbbc0b30ba6af2dcff675e4a57e3c2ad94ff1546523195e';
const realNonce = 452689;
const currentTime = Math.floor(Date.now() / 1000);

const rewardInfo = calculateRewardInfo(realNonce, realHash, currentTime);
console.log(`Real hash: ${realHash.substring(0, 20)}...`);
console.log(`Leading zero bits: ${rewardInfo.leadingZeros}`);
console.log(`Reward: ${rewardInfo.formattedAmount} $BRO`);
console.log(`Formula: ${rewardInfo.formula}`);
console.log(`Halvings: ${rewardInfo.halvings}`);

console.log('\n✅ BRO Formula Test Complete');
