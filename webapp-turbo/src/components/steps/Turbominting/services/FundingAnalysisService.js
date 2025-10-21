const MIN_UTXO_VALUE = 5000; // Minimum for prover: 330 (output) + 2500 (change) + 1000 (fees) + 333 (mining) - 333 = ~5000
const DUST_LIMIT = 546;

// Dynamic fee estimation (will be replaced by actual calculation)
let cachedFeeEstimate = null;

// Protected UTXO values - These contain digital assets and must not be spent
const PROTECTED_VALUES = [
  546,   // Ordinals & Runes - Minimum dust limit for inscriptions and rune protocols
  333,   // Rare Sats - Common value for rare satoshi collections
  330,   // Rare Sats - Alternative rare satoshi marker
  1000,  // BRC-20 & Ordinals - Common value for BRC-20 token transfers and small inscriptions
  777,   // Lucky Sats - Collectible satoshis with special significance
  600,   // Stamps Protocol - Bitcoin Stamps (SRC-20) use this value
  10000, // Large Inscriptions - Common value for larger ordinal inscriptions
  5000,  // Medium Inscriptions - Mid-size ordinal content
];

function isProtectedUtxo(utxo) {
  return PROTECTED_VALUES.includes(utxo.value);
}

export async function calculateUtxoSplitting(availableUtxos, requiredOutputs) {
  // Step 1: Filter protected UTXOs (digital assets)
  const usableUtxos = availableUtxos.filter(utxo => !isProtectedUtxo(utxo));
  const protectedCount = availableUtxos.length - usableUtxos.length;
  
  // Step 2: Identify valid UTXOs (already >= 3000 sats)
  const validUtxos = usableUtxos.filter(utxo => utxo.value >= MIN_UTXO_VALUE);
  const validCount = validUtxos.length;

  // Step 3: Check if we already have enough valid UTXOs
  if (validCount >= requiredOutputs) {
    const selected = validUtxos.slice(0, requiredOutputs);
    return {
      needsSplitting: false,
      strategy: 'sufficient',
      utxosToUse: selected,
      mathematics: {
        totalInput: selected.reduce((sum, u) => sum + u.value, 0),
        totalOutput: requiredOutputs * MIN_UTXO_VALUE,
        fee: 0,
        change: 0
      }
    };
  }

  // Step 4: Calculate total available value and requirements
  const totalValue = usableUtxos.reduce((sum, utxo) => sum + utxo.value, 0);
  
  // Dynamic fee estimation
  let totalFeeEstimate;
  try {
    const { getFeeEstimator } = await import('../../../../services/bitcoin/fee-estimator.js');
    const feeEstimator = getFeeEstimator();
    
    // Estimate: N inputs + requiredOutputs outputs
    const estimatedInputs = Math.min(usableUtxos.length, 5); // Conservative estimate
    const estimatedOutputs = requiredOutputs + 1; // outputs + change
    totalFeeEstimate = await feeEstimator.calculateFee(estimatedInputs, estimatedOutputs);
    
  } catch (error) {
    // Fallback to conservative estimate
    totalFeeEstimate = 1000 + (150 * requiredOutputs);
  }
  
  const requiredValue = (MIN_UTXO_VALUE * requiredOutputs) + totalFeeEstimate;

  // CASO 3: Fondos insuficientes para todos los outputs
  // Calcular cuántos outputs SÍ podemos financiar con lo que tenemos
  if (totalValue < requiredValue) {
    // Calcular el máximo de outputs que podemos crear
    const maxAffordableOutputs = Math.floor((totalValue - 1000) / MIN_UTXO_VALUE); // 1000 sats mínimo para fees
    
    if (maxAffordableOutputs === 0) {
      // No podemos crear ningún output
      return {
        needsSplitting: false,
        canAfford: 0,
        error: 'Insufficient funds - cannot create any outputs',
        totalValue,
        requiredValue,
        protectedUtxos: protectedCount,
        mathematics: {
          available: totalValue,
          needed: requiredValue,
          deficit: requiredValue - totalValue,
          maxAffordableOutputs: 0
        }
      };
    }
    
    // Podemos crear algunos outputs, pero no todos
    // Intentar crear una transacción de fondeo con los outputs que SÍ podemos pagar
    const partialPlan = calculatePartialFundingPlan(usableUtxos, maxAffordableOutputs, validUtxos);
    
    return {
      needsSplitting: partialPlan.needsTransaction,
      canAfford: maxAffordableOutputs,
      isPartial: true,
      strategy: partialPlan.strategy,
      totalValue,
      requiredValue,
      protectedUtxos: protectedCount,
      ...partialPlan,
      mathematics: {
        ...partialPlan.mathematics,
        available: totalValue,
        needed: requiredValue,
        deficit: requiredValue - totalValue,
        maxAffordableOutputs
      }
    };
  }

  // Step 5: Calculate how many outputs we need to create
  const missing = requiredOutputs - validCount;
  
  // Step 6: Categorize UTXOs by size
  const largeUtxos = usableUtxos
    .filter(utxo => utxo.value >= MIN_UTXO_VALUE * 2)
    .sort((a, b) => b.value - a.value);

  const smallUtxos = usableUtxos
    .filter(utxo => utxo.value < MIN_UTXO_VALUE && utxo.value >= DUST_LIMIT)
    .sort((a, b) => b.value - a.value);

  // Step 7: Try to split large UTXOs
  if (largeUtxos.length > 0) {
    const splitPlan = calculateSplitPlan(largeUtxos, validUtxos, missing, requiredOutputs);
    
    if (splitPlan.success) {
      return {
        needsSplitting: true,
        strategy: 'split_large',
        ...splitPlan
      };
    }
  }

  // Step 8: Try to combine small UTXOs
  if (smallUtxos.length >= 2) {
    const combinePlan = calculateCombinePlan(smallUtxos, validUtxos, missing, requiredOutputs);
    
    if (combinePlan.success) {
      return {
        needsSplitting: true,
        strategy: 'combine_small_and_split',
        ...combinePlan
      };
    }
  }

  // Step 9: Last resort - combine all and split
  const fallbackPlan = calculateFallbackPlan(usableUtxos, requiredOutputs);
  return {
    needsSplitting: true,
    strategy: 'combine_all_and_split',
    protectedUtxos: protectedCount,
    ...fallbackPlan
  };
}

// Calculate precise split plan for large UTXOs
function calculateSplitPlan(largeUtxos, validUtxos, missing, requiredOutputs) {
  const utxosToSplit = [];
  const splitDetails = [];
  let outputsToCreate = missing;
  let totalInputFromSplits = 0;

  for (const utxo of largeUtxos) {
    if (outputsToCreate <= 0) break;
    
    const feeForThisUtxo = 200; // Fee allocation per input UTXO
    const availableValue = utxo.value - feeForThisUtxo;
    const canCreate = Math.floor(availableValue / MIN_UTXO_VALUE);
    const willCreate = Math.min(canCreate, outputsToCreate);
    
    if (willCreate >= 1) {
      const outputsValue = willCreate * MIN_UTXO_VALUE;
      const changeValue = availableValue - outputsValue;
      
      utxosToSplit.push(utxo);
      totalInputFromSplits += utxo.value;
      
      splitDetails.push({
        utxo: { txid: utxo.txid, vout: utxo.vout, value: utxo.value },
        willCreate: willCreate,
        outputsValue: outputsValue,
        changeValue: changeValue,
        feeAllocated: feeForThisUtxo,
        mathematics: {
          input: utxo.value,
          outputs: outputsValue,
          change: changeValue > DUST_LIMIT ? changeValue : 0,
          fee: feeForThisUtxo + (changeValue <= DUST_LIMIT ? changeValue : 0)
        }
      });
      
      outputsToCreate -= willCreate;
    }
  }

  if (outputsToCreate > 0) {
    return { success: false };
  }

  const totalInputFromValid = validUtxos.reduce((sum, u) => sum + u.value, 0);
  const totalInput = totalInputFromValid + totalInputFromSplits;
  const totalOutput = requiredOutputs * MIN_UTXO_VALUE;
  const totalChange = splitDetails.reduce((sum, d) => sum + (d.changeValue > DUST_LIMIT ? d.changeValue : 0), 0);
  const totalFee = totalInput - totalOutput - totalChange;

  // Only use utxosToSplit as inputs (they will be split to create the required outputs)
  // Don't include validUtxos because we're creating NEW outputs from splitting
  return {
    success: true,
    inputUtxos: utxosToSplit,
    existingValid: validUtxos,
    toSplit: utxosToSplit,
    splitDetails: splitDetails,
    outputCount: requiredOutputs,
    outputValue: MIN_UTXO_VALUE,
    mathematics: {
      totalInput: totalInputFromSplits,
      totalOutput: totalOutput,
      totalChange: totalChange,
      totalFee: totalFee,
      validUtxosValue: 0,
      splitUtxosValue: totalInputFromSplits,
      balance: totalInputFromSplits - totalOutput - totalChange - totalFee
    }
  };
}

// Calculate precise combine plan for small UTXOs
function calculateCombinePlan(smallUtxos, validUtxos, missing, requiredOutputs) {
  let combinedValue = 0;
  const utxosToCombine = [];
  const baseFee = 500;
  const neededValue = (MIN_UTXO_VALUE * missing) + baseFee;
  
  for (const utxo of smallUtxos) {
    utxosToCombine.push(utxo);
    combinedValue += utxo.value;
    
    if (combinedValue >= neededValue) {
      break;
    }
  }

  if (combinedValue < neededValue) {
    return { success: false };
  }

  const totalInputFromValid = validUtxos.reduce((sum, u) => sum + u.value, 0);
  const totalInputFromCombined = combinedValue;
  const totalInput = totalInputFromValid + totalInputFromCombined;
  const totalOutput = requiredOutputs * MIN_UTXO_VALUE;
  const availableAfterOutputs = totalInput - totalOutput;
  const estimatedFee = 500 + (utxosToCombine.length * 100);
  const changeValue = availableAfterOutputs - estimatedFee;

  return {
    success: true,
    inputUtxos: [...validUtxos, ...utxosToCombine],
    existingValid: validUtxos,
    toCombine: utxosToCombine,
    combineDetails: {
      utxos: utxosToCombine.map(u => ({ txid: u.txid, vout: u.vout, value: u.value })),
      combinedValue: combinedValue,
      willCreateOutputs: missing
    },
    outputCount: requiredOutputs,
    outputValue: MIN_UTXO_VALUE,
    mathematics: {
      totalInput: totalInput,
      totalOutput: totalOutput,
      totalChange: changeValue > DUST_LIMIT ? changeValue : 0,
      totalFee: changeValue > DUST_LIMIT ? estimatedFee : availableAfterOutputs,
      validUtxosValue: totalInputFromValid,
      combinedUtxosValue: totalInputFromCombined,
      balance: 0
    }
  };
}

// Calculate partial funding plan when we can't afford all outputs
function calculatePartialFundingPlan(usableUtxos, maxAffordableOutputs, validUtxos) {
  // Si ya tenemos suficientes UTXOs válidas para los outputs que podemos pagar
  if (validUtxos.length >= maxAffordableOutputs) {
    return {
      needsTransaction: false,
      strategy: 'sufficient_for_partial',
      utxosToUse: validUtxos.slice(0, maxAffordableOutputs),
      outputCount: maxAffordableOutputs,
      mathematics: {
        totalInput: validUtxos.slice(0, maxAffordableOutputs).reduce((sum, u) => sum + u.value, 0),
        totalOutput: maxAffordableOutputs * MIN_UTXO_VALUE,
        totalFee: 0,
        totalChange: 0
      }
    };
  }
  
  // Necesitamos crear una transacción de fondeo para los outputs que podemos pagar
  const totalInput = usableUtxos.reduce((sum, u) => sum + u.value, 0);
  const totalOutput = maxAffordableOutputs * MIN_UTXO_VALUE;
  const estimatedFee = 1000 + (usableUtxos.length * 100) + (maxAffordableOutputs * 50);
  const changeValue = totalInput - totalOutput - estimatedFee;

  return {
    needsTransaction: true,
    strategy: 'partial_funding',
    inputUtxos: usableUtxos.sort((a, b) => b.value - a.value),
    outputCount: maxAffordableOutputs,
    outputValue: MIN_UTXO_VALUE,
    mathematics: {
      totalInput: totalInput,
      totalOutput: totalOutput,
      totalChange: changeValue > DUST_LIMIT ? changeValue : 0,
      totalFee: changeValue > DUST_LIMIT ? estimatedFee : (totalInput - totalOutput),
      balance: 0
    }
  };
}

// Fallback plan - combine everything
function calculateFallbackPlan(usableUtxos, requiredOutputs) {
  const totalInput = usableUtxos.reduce((sum, u) => sum + u.value, 0);
  const totalOutput = requiredOutputs * MIN_UTXO_VALUE;
  const estimatedFee = 1000 + (usableUtxos.length * 100) + (requiredOutputs * 50);
  const changeValue = totalInput - totalOutput - estimatedFee;

  return {
    success: true,
    inputUtxos: usableUtxos.sort((a, b) => b.value - a.value),
    outputCount: requiredOutputs,
    outputValue: MIN_UTXO_VALUE,
    mathematics: {
      totalInput: totalInput,
      totalOutput: totalOutput,
      totalChange: changeValue > DUST_LIMIT ? changeValue : 0,
      totalFee: changeValue > DUST_LIMIT ? estimatedFee : (totalInput - totalOutput),
      balance: 0
    }
  };
}

export function generateSplitOutputs(strategy, totalInputValue, outputCount, outputValue) {
  const estimatedFee = 1000 + (outputCount * 50);
  const availableForOutputs = totalInputValue - estimatedFee;
  
  if (availableForOutputs < outputValue * outputCount) {
    throw new Error('Insufficient value after fees');
  }

  const outputs = [];
  let remaining = availableForOutputs;

  for (let i = 0; i < outputCount; i++) {
    outputs.push({
      value: outputValue,
      index: i
    });
    remaining -= outputValue;
  }

  if (remaining > DUST_LIMIT) {
    outputs.push({
      value: remaining,
      index: outputCount,
      isChange: true
    });
  }

  return {
    outputs,
    totalOutputValue: outputs.reduce((sum, o) => sum + o.value, 0),
    fee: totalInputValue - outputs.reduce((sum, o) => sum + o.value, 0)
  };
}
