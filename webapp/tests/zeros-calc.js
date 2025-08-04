function leadingZeros(hash) {
    const hexZeros = hash.match(/^0*/)[0].length;
    const firstNonZeroIndex = hash.search(/[^0]/);
    const firstNonZeroChar = hash[firstNonZeroIndex];
    const firstNonZeroBinary = parseInt(firstNonZeroChar, 16).toString(2);
    return hexZeros * 4 + (4 - firstNonZeroBinary.length);
}

export { leadingZeros };