import { calculateRewardInfo } from '../src/mining/reward-calculator.js';

// Test data from the user's mining result
const testMiningResult = {
    nonce: 63334,
    hash: '000043a7379f5af022fb567b6875d67e1b010b92bc5d6c6eac56c8a40ccd3a01',
    difficulty: 4
};

console.log('🌐 Browser Integration Test');
console.log('===========================');

// Test 1: Verify reward calculation works
console.log('\n1. Testing reward calculation:');
const rewardInfo = calculateRewardInfo(testMiningResult.nonce, testMiningResult.hash);
console.log('✅ Reward calculation result:', rewardInfo);

// Test 2: Verify DOM elements exist
console.log('\n2. Testing DOM elements:');
const requiredElements = [
    'leadingZerosCount',
    'tokenReward',
    'proofOfWork',
    'rewardFormula'
];

const domResults = {};
requiredElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    domResults[elementId] = !!element;
    console.log(`${element ? '✅' : '❌'} ${elementId}: ${element ? 'Found' : 'Missing'}`);
});

// Test 3: Simulate updating DOM elements
console.log('\n3. Testing DOM updates:');
if (domResults.leadingZerosCount) {
    document.getElementById('leadingZerosCount').textContent = rewardInfo.leadingZeros.toString();
    console.log('✅ Updated leadingZerosCount');
}

if (domResults.tokenReward) {
    document.getElementById('tokenReward').textContent = rewardInfo.formattedAmount;
    console.log('✅ Updated tokenReward');
}

if (domResults.proofOfWork) {
    document.getElementById('proofOfWork').textContent = `${rewardInfo.leadingZeros} leading zeros`;
    console.log('✅ Updated proofOfWork');
}

if (domResults.rewardFormula) {
    document.getElementById('rewardFormula').textContent = 'S >> (30 - leadingZeros)';
    console.log('✅ Updated rewardFormula');
}

// Test 4: Final verification
console.log('\n4. Final verification:');
const allElementsFound = Object.values(domResults).every(found => found);
const rewardIsValid = rewardInfo.rawAmount > 0n;

console.log(`✅ All DOM elements found: ${allElementsFound}`);
console.log(`✅ Reward calculation valid: ${rewardIsValid}`);
console.log(`✅ Expected reward: ${rewardInfo.formattedAmount} $BRO`);

if (allElementsFound && rewardIsValid) {
    console.log('\n🎉 SUCCESS: Browser integration test passed!');
    console.log('The reward calculation is now working and will display in the UI.');
} else {
    console.log('\n❌ FAILED: Browser integration test failed!');
    console.log('Issues found:', {
        missingElements: !allElementsFound,
        invalidReward: !rewardIsValid
    });
}
