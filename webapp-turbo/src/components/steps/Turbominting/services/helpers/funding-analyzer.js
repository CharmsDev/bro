// Funding Analyzer - Determines optimal strategy for UTXO management
// Strategies: sufficient_utxos, reorganize, use_available_utxos, error

const MIN_UTXO_VALUE = 5000;
const ESTIMATED_FEE_PER_OUTPUT = 150;
const BASE_FEE = 1000;

export function analyzeFundingNeeds(availableUtxos, requiredOutputs) {
  if (!availableUtxos || availableUtxos.length === 0) {
    return { needsSplitting: false, canAfford: 0, isPartial: true, error: 'No UTXOs available in wallet' };
  }
  if (requiredOutputs <= 0) {
    return { needsSplitting: false, canAfford: 0, isPartial: true, error: 'Invalid number of required outputs' };
  }
  
  const usableUtxos = filterProtectedUtxos(availableUtxos);
  const validUtxos = usableUtxos.filter(u => u.value >= MIN_UTXO_VALUE);
  const totalValue = usableUtxos.reduce((sum, u) => sum + u.value, 0);
  const estimatedFee = BASE_FEE + (ESTIMATED_FEE_PER_OUTPUT * requiredOutputs);
  const requiredValue = (MIN_UTXO_VALUE * requiredOutputs) + estimatedFee;
  
  // CASE 1: Sufficient valid UTXOs
  if (validUtxos.length >= requiredOutputs) {
    return {
      needsSplitting: false,
      strategy: 'sufficient_utxos',
      utxosToUse: validUtxos.slice(0, requiredOutputs).map(u => ({
        ...u,
        source: 'existing'
      })),
      canAfford: requiredOutputs,
      isPartial: false
    };
  }
  
  // Calculate max affordable outputs with fees included
  const maxAffordableOutputs = Math.floor((totalValue - BASE_FEE) / (MIN_UTXO_VALUE + ESTIMATED_FEE_PER_OUTPUT));
  
  // CASE 3: Insufficient funds
  if (totalValue < requiredValue || maxAffordableOutputs < requiredOutputs) {
    if (validUtxos.length > 0) {
      return {
        needsSplitting: false,
        strategy: 'use_available_utxos',
        utxosToUse: validUtxos.map(u => ({ ...u, source: 'existing' })),
        canAfford: validUtxos.length,
        isPartial: true,
        message: `Insufficient funds for ${requiredOutputs} outputs. Using ${validUtxos.length} available UTXOs instead.`
      };
    }
    return {
      needsSplitting: false,
      canAfford: 0,
      isPartial: true,
      error: 'Insufficient funds to create any outputs. Please add more funds.'
    };
  }
  
  // CASE 2: Reorganize UTXOs
  return createFundingPlan(usableUtxos, requiredOutputs, false);
}

function createFundingPlan(utxos, outputCount, isPartial) {
  const totalInput = utxos.reduce((sum, u) => sum + u.value, 0);
  const totalOutput = outputCount * MIN_UTXO_VALUE;
  const estimatedFee = BASE_FEE + (ESTIMATED_FEE_PER_OUTPUT * outputCount);
  const totalChange = totalInput - totalOutput - estimatedFee;
  const requiredForAll = (outputCount * MIN_UTXO_VALUE) + estimatedFee;
  const deficit = isPartial ? Math.max(0, requiredForAll - totalInput) : 0;
  
  return {
    needsSplitting: true,
    strategy: isPartial ? 'partial_funding' : 'reorganize',
    canAfford: outputCount,
    isPartial,
    inputUtxos: utxos,
    outputCount,
    outputValue: MIN_UTXO_VALUE,
    mathematics: {
      totalInput,
      totalOutput,
      totalChange: Math.max(0, totalChange),
      totalFee: estimatedFee,
      deficit
    }
  };
}

// Filter protected UTXOs
function filterProtectedUtxos(utxos) {
  const PROTECTED_VALUES = [546, 333, 330, 1000, 777, 600, 10000];
  return utxos.filter(utxo => !PROTECTED_VALUES.includes(utxo.value));
}
