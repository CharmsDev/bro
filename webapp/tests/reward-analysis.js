// Analysis of the reward calculation problem

const S = 69_420_000_000n;
const testData = {
    nonce: 63334,
    hash: '000043a7379f5af022fb567b6875d67e1b010b92bc5d6c6eac56c8a40ccd3a01',
    difficulty: 4
};

console.log('🔍 Analyzing the reward calculation problem');
console.log('==========================================');

// Current formula analysis
const nonce = BigInt(testData.nonce);
const leadingZeros = 17; // from our test
const currentShift = nonce + BigInt(256 - leadingZeros + 2);

console.log('\n📊 Current formula analysis:');
console.log(`Total supply: ${S} (${S.toString(2).length} bits)`);
console.log(`Nonce: ${nonce}`);
console.log(`Leading zeros: ${leadingZeros}`);
console.log(`Current shift: ${nonce} + (256 - ${leadingZeros} + 2) = ${currentShift}`);
console.log(`Result: ${S} >> ${currentShift} = ${currentShift >= 256n ? 0n : (S >> currentShift)}`);

console.log('\n❌ Problem: Shift amount is too large!');
console.log(`The shift amount (${currentShift}) is much larger than the bit length of the supply (${S.toString(2).length} bits)`);

console.log('\n💡 Proposed fixes:');

// Fix 1: Use only leading zeros for shift (ignore nonce)
const fix1Shift = BigInt(256 - leadingZeros);
const fix1Result = fix1Shift >= 64n ? 0n : (S >> fix1Shift);
console.log(`\nFix 1 - Only leading zeros: S >> (256 - leadingZeros)`);
console.log(`Shift: 256 - ${leadingZeros} = ${fix1Shift}`);
console.log(`Result: ${S} >> ${fix1Shift} = ${fix1Result}`);

// Fix 2: Use leading zeros directly as shift
const fix2Shift = BigInt(leadingZeros);
const fix2Result = S >> fix2Shift;
console.log(`\nFix 2 - Direct leading zeros: S >> leadingZeros`);
console.log(`Shift: ${fix2Shift}`);
console.log(`Result: ${S} >> ${fix2Shift} = ${fix2Result}`);

// Fix 3: Use a smaller base shift with leading zeros bonus
const fix3BaseShift = 20n; // Base shift to make rewards reasonable
const fix3Bonus = BigInt(Math.max(0, leadingZeros - 10)); // Bonus for extra leading zeros
const fix3Shift = fix3BaseShift - fix3Bonus;
const fix3Result = fix3Shift < 0n ? S : (S >> fix3Shift);
console.log(`\nFix 3 - Base shift with bonus: S >> (baseShift - leadingZerosBonus)`);
console.log(`Base shift: ${fix3BaseShift}, Bonus: ${fix3Bonus}, Final shift: ${fix3Shift}`);
console.log(`Result: ${S} >> ${fix3Shift} = ${fix3Result}`);

// Fix 4: Logarithmic approach
const fix4Shift = BigInt(Math.max(0, 30 - leadingZeros)); // Start from 30, reduce by leading zeros
const fix4Result = S >> fix4Shift;
console.log(`\nFix 4 - Logarithmic: S >> (30 - leadingZeros)`);
console.log(`Shift: 30 - ${leadingZeros} = ${fix4Shift}`);
console.log(`Result: ${S} >> ${fix4Shift} = ${fix4Result}`);

// Test with different leading zero counts
console.log('\n📈 Testing different leading zero counts:');
for (let lz = 10; lz <= 25; lz += 5) {
    const shift = BigInt(Math.max(0, 30 - lz));
    const result = S >> shift;
    console.log(`Leading zeros: ${lz}, Shift: ${shift}, Reward: ${result}`);
}

console.log('\n🎯 Recommendation: Use Fix 4 (logarithmic approach)');
console.log('This provides reasonable rewards that scale with difficulty');
