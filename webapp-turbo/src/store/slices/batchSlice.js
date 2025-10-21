// Batch configuration slice for Zustand store
import { BATCH_CONFIG, FUNDING_STATUS, calculateRequiredFunds, calculateMaxMints } from '../../constants/batch.js';
import BatchModule from '../../modules/batch/BatchModule.js';

export const createBatchSlice = (set, get) => ({
  // Batch state
  batch: {
    quantity: BATCH_CONFIG.DEFAULT_BATCH_SIZE,
    requiredFunds: BATCH_CONFIG.COST_PER_MINT,
    availableFunds: 0,
    fundingStatus: FUNDING_STATUS.INSUFFICIENT,
    utxos: [],
    selectedUtxos: [],
    isMonitoring: false,
    lastUpdated: null
  },

  // Batch actions
  setBatchQuantity: (quantity) => {
    const requiredFunds = calculateRequiredFunds(quantity);
    const { batch } = get();
    const fundingStatus = batch.availableFunds >= requiredFunds 
      ? FUNDING_STATUS.SUFFICIENT 
      : FUNDING_STATUS.INSUFFICIENT;

    set((state) => ({
      batch: {
        ...state.batch,
        quantity,
        requiredFunds,
        fundingStatus
      }
    }));
  },

  setUtxos: (utxos) => {
    const totalFunds = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    const { batch } = get();
    const fundingStatus = totalFunds >= batch.requiredFunds 
      ? FUNDING_STATUS.SUFFICIENT 
      : FUNDING_STATUS.INSUFFICIENT;

    set((state) => ({
      batch: {
        ...state.batch,
        utxos,
        availableFunds: totalFunds,
        fundingStatus,
        lastUpdated: new Date().toISOString()
      }
    }));
    
    // Save to localStorage
    const updatedBatch = get().batch;
    BatchModule.save(updatedBatch);
  },

  setSelectedUtxos: (selectedUtxos) => {
    set((state) => ({
      batch: {
        ...state.batch,
        selectedUtxos
      }
    }));
    
    // Save to localStorage
    const { batch } = get();
    BatchModule.save(batch);
  },

  setMonitoring: (isMonitoring) => {
    set((state) => ({
      batch: {
        ...state.batch,
        isMonitoring,
        fundingStatus: isMonitoring ? FUNDING_STATUS.MONITORING : state.batch.fundingStatus
      }
    }));
  },

  setFundingStatus: (fundingStatus) => {
    set((state) => ({
      batch: {
        ...state.batch,
        fundingStatus
      }
    }));
  },

  // Batch validation and helpers
  isBatchReady: () => {
    const { batch } = get();
    return batch.fundingStatus === FUNDING_STATUS.SUFFICIENT && 
           batch.quantity > 0 && 
           batch.selectedUtxos.length > 0;
  },

  getMaxPossibleMints: () => {
    const { batch } = get();
    return calculateMaxMints(batch.availableFunds);
  },

  getFundingShortfall: () => {
    const { batch } = get();
    return Math.max(0, batch.requiredFunds - batch.availableFunds);
  },

  // Select optimal UTXOs for the batch
  selectOptimalUtxos: () => {
    const { batch } = get();
    const { utxos, requiredFunds } = batch;
    
    if (utxos.length === 0) return [];
    
    // Sort UTXOs by value (descending) for optimal selection
    const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value);
    
    const selectedUtxos = [];
    let totalSelected = 0;
    
    for (const utxo of sortedUtxos) {
      if (totalSelected >= requiredFunds) break;
      selectedUtxos.push(utxo);
      totalSelected += utxo.value;
    }
    
    // Update selected UTXOs in state
    set((state) => ({
      batch: {
        ...state.batch,
        selectedUtxos
      }
    }));
    
    return selectedUtxos;
  },

  // Load batch configuration from localStorage
  loadBatchData: () => {
    try {
      const batchData = BatchModule.load();
      
      if (batchData) {
        set((state) => ({
          batch: {
            ...state.batch,
            quantity: batchData.quantity || state.batch.quantity,
            utxos: batchData.utxos || [],
            selectedUtxos: batchData.selectedUtxos || [],
            requiredFunds: batchData.requiredFunds || state.batch.requiredFunds,
            availableFunds: batchData.availableFunds || 0,
            fundingStatus: batchData.fundingStatus || FUNDING_STATUS.INSUFFICIENT
          }
        }));
        
        return true;
      }
    } catch (error) {
    }
    
    return false;
  },

  // Reset batch configuration
  resetBatch: () => {
    set((state) => ({
      batch: {
        quantity: BATCH_CONFIG.DEFAULT_BATCH_SIZE,
        requiredFunds: BATCH_CONFIG.COST_PER_MINT,
        availableFunds: 0,
        fundingStatus: FUNDING_STATUS.INSUFFICIENT,
        utxos: [],
        selectedUtxos: [],
        isMonitoring: false,
        lastUpdated: null
      }
    }));
    
    BatchModule.clear();
  }
});
