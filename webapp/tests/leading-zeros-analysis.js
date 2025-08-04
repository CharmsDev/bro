// Análisis detallado del cálculo de leading zeros

const hash = '000043a7379f5af022fb567b6875d67e1b010b92bc5d6c6eac56c8a40ccd3a01';

console.log('🔍 Análisis de Leading Zeros');
console.log('============================');

console.log(`Hash: ${hash}`);

// Análisis hexadecimal
const hexZeros = hash.match(/^0*/)[0].length;
console.log(`\n📊 Análisis Hexadecimal:`);
console.log(`Ceros hexadecimales al inicio: ${hexZeros}`);
console.log(`Cada cero hex = 4 bits, entonces: ${hexZeros} × 4 = ${hexZeros * 4} bits`);

// Análisis binario manual
console.log(`\n🔢 Análisis Binario Manual:`);
const hashWithoutPrefix = hash.startsWith('0x') ? hash.slice(2) : hash;
const paddedHash = hashWithoutPrefix.padStart(64, '0');
console.log(`Hash padded: ${paddedHash}`);

// Convertir a BigInt y luego a binario
const bigIntValue = BigInt('0x' + paddedHash);
console.log(`BigInt value: ${bigIntValue}`);

const binaryString = bigIntValue.toString(2);
console.log(`Binary string: ${binaryString}`);
console.log(`Binary length: ${binaryString.length} bits`);

const leadingZerosBinary = 256 - binaryString.length;
console.log(`Leading zeros (256 - length): ${leadingZerosBinary}`);

// Verificar los primeros caracteres del hash
console.log(`\n🔍 Primeros caracteres del hash:`);
for (let i = 0; i < 8; i++) {
    const hexChar = paddedHash[i];
    const binaryChar = parseInt(hexChar, 16).toString(2).padStart(4, '0');
    console.log(`${hexChar} (hex) = ${binaryChar} (bin)`);
}

// Análisis del primer carácter no-cero
const firstNonZeroIndex = paddedHash.search(/[^0]/);
const firstNonZeroChar = paddedHash[firstNonZeroIndex];
const firstNonZeroBinary = parseInt(firstNonZeroChar, 16).toString(2);

console.log(`\n🎯 Primer carácter no-cero:`);
console.log(`Posición: ${firstNonZeroIndex}`);
console.log(`Carácter: ${firstNonZeroChar} (hex)`);
console.log(`Binario: ${firstNonZeroBinary}`);
console.log(`Leading zeros en este carácter: ${4 - firstNonZeroBinary.length}`);

const totalLeadingZeros = firstNonZeroIndex * 4 + (4 - firstNonZeroBinary.length);
console.log(`Total leading zeros: ${firstNonZeroIndex} × 4 + ${4 - firstNonZeroBinary.length} = ${totalLeadingZeros}`);

// Comparar con la función actual
import { leadingZeros } from '../src/mining/reward-calculator.js';
const functionResult = leadingZeros(hash);
console.log(`\n⚖️ Comparación:`);
console.log(`Función actual: ${functionResult}`);
console.log(`Cálculo manual: ${totalLeadingZeros}`);
console.log(`¿Coinciden?: ${functionResult === totalLeadingZeros ? '✅' : '❌'}`);

// Análisis del reward
console.log(`\n💰 Análisis del Reward:`);
const S = 69_420_000_000n;
const shift = Math.max(0, 30 - functionResult);
const reward = S >> BigInt(shift);
const formattedReward = (Number(reward) / 100000000).toFixed(8);

console.log(`Total supply: ${S}`);
console.log(`Leading zeros: ${functionResult}`);
console.log(`Shift: 30 - ${functionResult} = ${shift}`);
console.log(`Reward: ${S} >> ${shift} = ${reward}`);
console.log(`Formatted: ${formattedReward} $BRO`);

// ¿Es esto razonable?
console.log(`\n🤔 ¿Es razonable este reward?`);
console.log(`Para ${hexZeros} ceros hexadecimales (dificultad 4), recibir ${formattedReward} $BRO`);
console.log(`Esto representa ${(Number(reward) / Number(S) * 100).toFixed(8)}% del total supply`);
