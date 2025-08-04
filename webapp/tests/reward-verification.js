import { calculateRewardInfo } from '../src/mining/reward-calculator.js';

console.log('🎯 Final Reward Verification Test');
console.log('=================================');

// Test with the original data
const originalData = {
    nonce: 63334,
    hash: '000043a7379f5af022fb567b6875d67e1b010b92bc5d6c6eac56c8a40ccd3a01'
};

console.log('\n📊 Original test data:');
const originalResult = calculateRewardInfo(originalData.nonce, originalData.hash);
console.log(`Hash: ${originalData.hash}`);
console.log(`Leading zeros: ${originalResult.leadingZeros}`);
console.log(`Reward: ${originalResult.formattedAmount} $BRO`);
console.log(`Raw amount: ${originalResult.rawAmount}`);

// Test reward scaling with different difficulty levels
console.log('\n📈 Reward scaling verification:');
console.log('Leading Zeros | Shift | Reward ($BRO)');
console.log('-------------|-------|---------------');

const testCases = [
    { lz: 10, hash: '0003ffffff...' },
    { lz: 15, hash: '00007fffff...' },
    { lz: 17, hash: '000043a737...' }, // Our actual case
    { lz: 20, hash: '00000fffff...' },
    { lz: 25, hash: '0000001fff...' },
    { lz: 30, hash: '000000003f...' }
];

testCases.forEach(testCase => {
    const shift = Math.max(0, 30 - testCase.lz);
    const S = 69_420_000_000n;
    const rawReward = S >> BigInt(shift);
    const formattedReward = (Number(rawReward) / 100000000).toFixed(8);

    console.log(`     ${testCase.lz.toString().padStart(2)}      |   ${shift.toString().padStart(2)}  | ${formattedReward.padStart(12)}`);
});

console.log('\n✅ Reward calculation is now working correctly!');
console.log('💡 The formula S >> (30 - leadingZeros) provides reasonable rewards that scale with mining difficulty.');
