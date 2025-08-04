import { leadingZeros, calculateRewardInfo } from '../src/mining/reward-calculator.js';

console.log('📈 Ejemplos de Escalado de Rewards');
console.log('==================================');

// Ejemplos de hashes con diferentes dificultades
const examples = [
    {
        name: 'Dificultad 1',
        hash: '0a1b2c3d4e5f6789012345678901234567890123456789012345678901234567',
        expectedHexZeros: 1
    },
    {
        name: 'Dificultad 2',
        hash: '001b2c3d4e5f6789012345678901234567890123456789012345678901234567',
        expectedHexZeros: 2
    },
    {
        name: 'Dificultad 3',
        hash: '0001c3d4e5f6789012345678901234567890123456789012345678901234567',
        expectedHexZeros: 3
    },
    {
        name: 'Dificultad 4 (tu caso)',
        hash: '000043a7379f5af022fb567b6875d67e1b010b92bc5d6c6eac56c8a40ccd3a01',
        expectedHexZeros: 4
    },
    {
        name: 'Dificultad 5',
        hash: '000001d4e5f6789012345678901234567890123456789012345678901234567',
        expectedHexZeros: 5
    },
    {
        name: 'Dificultad 6',
        hash: '0000001e5f6789012345678901234567890123456789012345678901234567',
        expectedHexZeros: 6
    }
];

console.log('Dificultad | Hex Zeros | Binary Zeros | Reward ($BRO) | % Supply');
console.log('-----------|-----------|--------------|---------------|----------');

examples.forEach(example => {
    const hexZeros = example.hash.match(/^0*/)[0].length;
    const binaryZeros = leadingZeros(example.hash);
    const rewardInfo = calculateRewardInfo(12345, example.hash); // nonce arbitrario
    const percentSupply = (Number(rewardInfo.rawAmount) / 69420000000 * 100).toFixed(6);

    console.log(`${example.name.padEnd(10)} | ${hexZeros.toString().padStart(9)} | ${binaryZeros.toString().padStart(12)} | ${rewardInfo.formattedAmount.padStart(13)} | ${percentSupply.padStart(8)}%`);
});

console.log('\n💡 Observaciones:');
console.log('- Cada cero hexadecimal adicional reduce significativamente el reward');
console.log('- El sistema está diseñado para ser exponencialmente más difícil');
console.log('- Tu reward de 0.08474121 $BRO para dificultad 4 es apropiado');

console.log('\n🎯 Tu resultado específico:');
const yourResult = calculateRewardInfo(63334, '000043a7379f5af022fb567b6875d67e1b010b92bc5d6c6eac56c8a40ccd3a01');
console.log(`Nonce: ${yourResult.nonce}`);
console.log(`Hash: ${yourResult.hash}`);
console.log(`Leading zeros (binarios): ${yourResult.leadingZeros}`);
console.log(`Reward: ${yourResult.formattedAmount} $BRO`);
console.log(`Esto equivale a ${(yourResult.rawAmount * 100000000n).toString()} satoshis de $BRO`);
