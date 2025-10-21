/**
 * Funding Analyzer - Simple and elegant algorithm for UTXO analysis
 * 
 * Three cases handled:
 * 1. Sufficient valid UTXOs (≥5000 sats each) → Use existing
 * 2. Sufficient total value but small UTXOs → Create funding TX
 * 3. Insufficient total value → Create partial funding TX + allow adding more funds
 * 
 * EXAMPLES:
 * 
 * Case 1: [6000, 7000, 8000] sats, need 2 outputs
 * → needsSplitting: false, use first 2 UTXOs
 * 
 * Case 2: [12000] sats, need 2 outputs
 * → needsSplitting: true, split 12000 into 2x5000 + change
 * 
 * Case 3: [6000] sats, need 3 outputs
 * → needsSplitting: true, isPartial: true, create 1 output (max affordable)
 * → User can add more funds to create remaining outputs
 */

const MIN_UTXO_VALUE = 5000;
const ESTIMATED_FEE_PER_OUTPUT = 150;
const BASE_FEE = 1000;

/**
 * Main analysis function - Simple and elegant
 */
export function analyzeFundingNeeds(availableUtxos, requiredOutputs) {
  // Filter protected UTXOs (digital assets)
  const usableUtxos = filterProtectedUtxos(availableUtxos);
  
  // Separate valid (≥5000) and invalid (<5000) UTXOs
  const validUtxos = usableUtxos.filter(u => u.value >= MIN_UTXO_VALUE);
  const invalidUtxos = usableUtxos.filter(u => u.value < MIN_UTXO_VALUE);
  
  // Calculate totals
  const totalValue = usableUtxos.reduce((sum, u) => sum + u.value, 0);
  const estimatedFee = BASE_FEE + (ESTIMATED_FEE_PER_OUTPUT * requiredOutputs);
  const requiredValue = (MIN_UTXO_VALUE * requiredOutputs) + estimatedFee;
  
  // CASE 1: Sufficient valid UTXOs - Use existing (no funding TX needed)
  if (validUtxos.length >= requiredOutputs) {
    return {
      needsSplitting: false,
      strategy: 'sufficient',
      utxosToUse: validUtxos.slice(0, requiredOutputs),
      canAfford: requiredOutputs,
      isPartial: false
    };
  }
  
  // CASE 2 & 3: Need funding TX
  const maxAffordableOutputs = Math.floor((totalValue - BASE_FEE) / MIN_UTXO_VALUE);
  
  // CASE 3: Insufficient funds - Create partial funding TX
  if (totalValue < requiredValue || maxAffordableOutputs < requiredOutputs) {
    const outputsToCreate = Math.min(maxAffordableOutputs, requiredOutputs);
    
    if (outputsToCreate === 0) {
      return {
        needsSplitting: false,
        canAfford: 0,
        isPartial: true,
        error: 'Insufficient funds to create any outputs'
      };
    }
    
    return createFundingPlan(usableUtxos, outputsToCreate, true);
  }
  
  // CASE 2: Sufficient funds but need to reorganize UTXOs
  return createFundingPlan(usableUtxos, requiredOutputs, false);
}

/**
 * Create funding transaction plan
 * Simple approach: Use all available UTXOs as inputs, create required outputs
 */
function createFundingPlan(utxos, outputCount, isPartial) {
  const totalInput = utxos.reduce((sum, u) => sum + u.value, 0);
  const totalOutput = outputCount * MIN_UTXO_VALUE;
  const estimatedFee = BASE_FEE + (ESTIMATED_FEE_PER_OUTPUT * outputCount);
  const totalChange = totalInput - totalOutput - estimatedFee;
  
  // Calculate deficit if partial
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

/**
 * Filter protected UTXOs (digital assets that must not be spent)
 */
function filterProtectedUtxos(utxos) {
  const PROTECTED_VALUES = [546, 333, 330, 1000, 777, 600, 10000, 5000];
  return utxos.filter(utxo => !PROTECTED_VALUES.includes(utxo.value));
}
