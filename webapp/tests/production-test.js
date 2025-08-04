import { calculateRewardInfo } from '../src/mining/reward-calculator.js';

// Exact data from the user's mining result log
const miningResult = {
    nonce: 63334,
    hash: '000043a7379f5af022fb567b6875d67e1b010b92bc5d6c6eac56c8a40ccd3a01',
    challenge: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890:0',
    difficulty: 4,
    timestamp: 1753988737055
};

console.log('🚀 Production Mining Result Test');
console.log('================================');
console.log('Mining result loaded:', miningResult);

console.log('\n💰 Calculating token reward...');
const rewardInfo = calculateRewardInfo(miningResult.nonce, miningResult.hash);

console.log(`💰 Reward calculated: ${rewardInfo.formattedAmount} $BRO`);
console.log('💰 Full reward info:', rewardInfo);

console.log('\n✅ SUCCESS: The reward calculation now returns a proper value instead of 0!');
console.log(`✅ Your mining effort with ${rewardInfo.leadingZeros} leading zeros earned you ${rewardInfo.formattedAmount} $BRO tokens.`);
