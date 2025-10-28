/**
 * Calculate total cost for turbomining transaction
 * @param {number} outputs - Number of outputs to create
 * @param {number} costPerOutput - Cost per output (default 333 sats)
 * @param {number} feeRate - Fee rate in sat/vB (optional, uses dynamic if not provided)
 * @returns {number|Promise<number>} Total cost in satoshis
 */
export const calculateTotalCost = async (outputs, costPerOutput = 333, feeRate = null) => {
  if (!outputs || outputs <= 0) return 0;
  
  // If fee rate not provided, fetch dynamically
  if (feeRate === null) {
    try {
      const { getFeeEstimator } = await import('../../../../services/bitcoin/fee-estimator.js');
      const feeEstimator = getFeeEstimator();
      
      // Calculate fee for: 1 input + 1 OP_RETURN + N outputs (+ possible change)
      const numInputs = 1;
      const numOutputs = 1 + outputs; // OP_RETURN + spendable outputs
      const estimatedFee = await feeEstimator.calculateFee(numInputs, numOutputs);
      
      return (outputs * costPerOutput) + estimatedFee;
    } catch (error) {
      console.warn('Failed to fetch dynamic fee, using fallback:', error);
      // Fallback to conservative estimate for testnet (2 sat/vB)
      feeRate = 2;
    }
  }
  
  // Manual calculation if fee rate is provided
  // Transaction structure: 1 input (58 vB) + 1 OP_RETURN (43 vB) + N outputs (43 vB each) + overhead (10.5 vB)
  const txSize = 10.5 + 58 + 43 + (outputs * 43);
  const estimatedFee = Math.ceil(txSize * feeRate);
  
  return (outputs * costPerOutput) + estimatedFee;
};

export const selectUtxosForCost = (availableUtxos, targetCost) => {
  if (!availableUtxos || !Array.isArray(availableUtxos)) {
    return { utxos: [], totalValue: 0, sufficient: false, excess: 0 };
  }

  const sortedUtxos = [...availableUtxos].sort((a, b) => b.value - a.value);
  
  const selectedUtxos = [];
  let totalValue = 0;

  for (const utxo of sortedUtxos) {
    if (totalValue >= targetCost) break;
    selectedUtxos.push(utxo);
    totalValue += utxo.value;
  }

  return {
    utxos: selectedUtxos,
    totalValue,
    sufficient: totalValue >= targetCost,
    excess: totalValue - targetCost
  };
};

export const calculateMaxAffordableOutputs = async (availableUtxos, outputOptions = [2, 4, 8, 16, 32, 64, 128, 256], costPerOutput = 333, feeRate = null) => {
  if (!availableUtxos || !Array.isArray(availableUtxos)) return 0;
  
  const totalAvailable = availableUtxos.reduce((sum, utxo) => sum + utxo.value, 0);
  
  for (let i = outputOptions.length - 1; i >= 0; i--) {
    const outputs = outputOptions[i];
    const totalCost = await calculateTotalCost(outputs, costPerOutput, feeRate);
    if (totalAvailable >= totalCost) {
      return outputs;
    }
  }
  return 0;
};

export const isOutputAffordable = async (outputs, availableUtxos, costPerOutput = 333, feeRate = null) => {
  if (!availableUtxos || !Array.isArray(availableUtxos)) return false;
  
  const totalAvailable = availableUtxos.reduce((sum, utxo) => sum + utxo.value, 0);
  const totalCost = await calculateTotalCost(outputs, costPerOutput, feeRate);
  
  return totalAvailable >= totalCost;
};

export const getAvailableUtxos = (walletUtxos) => {
  if (!walletUtxos) return [];
  
  let allUtxos = [];
  if (walletUtxos.available) {
    allUtxos = [...walletUtxos.available];
  } else {
    allUtxos = [
      ...(walletUtxos.recipient || []),
      ...(walletUtxos.change || [])
    ];
  }
  
  return allUtxos.sort((a, b) => b.value - a.value);
};

export const TURBOMINING_CONSTANTS = {
  OUTPUT_OPTIONS: [2, 4, 8, 16, 32, 64, 128, 256],
  COST_PER_OUTPUT: 333, // satoshis (Taproot dust limit 330 + 3 extra)
  MIN_CHANGE_OUTPUT: 546, // dust limit
  // Note: Fees are calculated dynamically using FeeEstimator service
  // which fetches real-time network fee rates via estimatesmartfee RPC
};
