export const calculateTotalCost = (outputs, costPerOutput = 333, feePerOutput = 7) => {
  if (!outputs || outputs <= 0) return 0;
  return outputs * (costPerOutput + feePerOutput);
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

export const calculateMaxAffordableOutputs = (availableUtxos, outputOptions = [2, 4, 8, 16, 32, 64, 128, 256], costPerOutput = 333, feePerOutput = 7) => {
  if (!availableUtxos || !Array.isArray(availableUtxos)) return 0;
  
  const totalAvailable = availableUtxos.reduce((sum, utxo) => sum + utxo.value, 0);
  
  for (let i = outputOptions.length - 1; i >= 0; i--) {
    const outputs = outputOptions[i];
    const totalCost = calculateTotalCost(outputs, costPerOutput, feePerOutput);
    if (totalAvailable >= totalCost) {
      return outputs;
    }
  }
  return 0;
};

export const isOutputAffordable = (outputs, availableUtxos, costPerOutput = 333, feePerOutput = 7) => {
  if (!availableUtxos || !Array.isArray(availableUtxos)) return false;
  
  const totalAvailable = availableUtxos.reduce((sum, utxo) => sum + utxo.value, 0);
  const totalCost = calculateTotalCost(outputs, costPerOutput, feePerOutput);
  
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
  FEE_PER_OUTPUT: 7,    // satoshis
  MIN_CHANGE_OUTPUT: 546 // dust limit
};
