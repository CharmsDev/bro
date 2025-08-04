import { leadingZeros, reward, calculateRewardInfo, getRewardStats } from '../src/mining/reward-calculator.js';

// Test data from the user's log
const testData = {
    nonce: 63334,
    hash: '000043a7379f5af022fb567b6875d67e1b010b92bc5d6c6eac56c8a40ccd3a01',
    difficulty: 4
};

console.log('🧪 Testing Reward Calculator');
console.log('============================');

// Test 1: Leading zeros calculation
console.log('\n1. Testing leading zeros calculation:');
const lz = leadingZeros(testData.hash);
console.log(`Hash: ${testData.hash}`);
console.log(`Leading zeros: ${lz}`);

// Test 2: Manual leading zeros verification
console.log('\n2. Manual verification:');
const hashWithoutPrefix = testData.hash.startsWith('0x') ? testData.hash.slice(2) : testData.hash;
const manualCount = hashWithoutPrefix.match(/^0*/)[0].length;
console.log(`Manual count (hex digits): ${manualCount}`);
console.log(`Binary leading zeros: ${lz}`);

// Test 3: Reward calculation
console.log('\n3. Testing reward calculation:');
const rewardAmount = reward(BigInt(testData.nonce), testData.hash);
console.log(`Nonce: ${testData.nonce}`);
console.log(`Reward: ${rewardAmount}`);

// Test 4: Full reward info
console.log('\n4. Full reward calculation:');
const rewardInfo = calculateRewardInfo(testData.nonce, testData.hash);
console.log('Reward info:', rewardInfo);

// Test 5: Detailed stats
console.log('\n5. Detailed reward stats:');
const stats = getRewardStats(testData.nonce, testData.hash);
console.log('Stats:', stats);

// Test 6: Step by step calculation
console.log('\n6. Step by step calculation:');
const S = 69_420_000_000n;
const nonceBigInt = BigInt(testData.nonce);
const leadingZerosCount = leadingZeros(testData.hash);
const shift = nonceBigInt + BigInt(256 - leadingZerosCount + 2);

console.log(`Total supply (S): ${S}`);
console.log(`Nonce: ${nonceBigInt}`);
console.log(`Leading zeros: ${leadingZerosCount}`);
console.log(`Shift calculation: ${nonceBigInt} + (256 - ${leadingZerosCount} + 2) = ${shift}`);
console.log(`Result: ${S} >> ${shift} = ${shift >= 256n ? 0n : (S >> shift)}`);

// Test 7: Test with different scenarios
console.log('\n7. Testing edge cases:');

// Test with smaller nonce
const smallNonce = 100;
const smallReward = reward(BigInt(smallNonce), testData.hash);
console.log(`Small nonce (${smallNonce}): ${smallReward}`);

// Test with zero nonce
const zeroReward = reward(0n, testData.hash);
console.log(`Zero nonce: ${zeroReward}`);

// Test with hash that has more leading zeros
const betterHash = '00000043a7379f5af022fb567b6875d67e1b010b92bc5d6c6eac56c8a40ccd3a01';
const betterReward = reward(BigInt(testData.nonce), betterHash);
console.log(`Better hash (${betterHash}): ${betterReward}`);

console.log('\n🧪 Test completed!');
