import CentralStorage from '../../storage/CentralStorage.js';

class TurbomintingModule {
  static load() {
    try {
      return CentralStorage.getTurbominting() || null;
    } catch (error) {
      return null;
    }
  }

  static save(data) {
    try {
      const toSave = { ...data, timestamp: Date.now() };
      CentralStorage.saveTurbominting(toSave);
      return true;
    } catch (error) {
      return false;
    }
  }

  static update(updates) {
    const current = this.load() || {};
    return this.save({ ...current, ...updates });
  }

  static hydrate(store) {
    try {
      const data = this.load();
      if (data && store) {
        // Turbominting data is loaded but not directly set in store
        // It's accessed via the module when needed
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  static clear() {
    try {
      CentralStorage.clear('turbominting');
      return true;
    } catch (error) {
      return false;
    }
  }

  static setMiningBroadcast(txid, explorerUrl) {
    return this.update({ miningTxid: txid, explorerUrl, miningTxConfirmed: false, miningReady: false });
  }

  static setMiningConfirmed(confirmationInfo) {
    return this.update({ miningTxConfirmed: true, confirmationInfo, miningReady: true });
  }

  static setFundingBroadcast(txid, explorerUrl, fundingTransaction = null, fundingAnalysis = null) {
    return this.update({ 
      fundingTxid: txid, 
      fundingExplorerUrl: explorerUrl, 
      fundingTxConfirmed: false, 
      fundingReady: true,
      fundingBroadcasted: true,
      fundingTransaction,
      fundingAnalysis
    });
  }

  static setFundingConfirmed(confirmationInfo) {
    return this.update({ fundingTxConfirmed: true, fundingConfirmationInfo: confirmationInfo });
  }

  // Readiness flags management
  static setMiningReady(ready = true) {
    return this.update({ miningReady: ready });
  }

  static setFundingReady(ready = true) {
    return this.update({ fundingReady: ready });
  }

  static isMintingReady() {
    const data = this.load();
    return data?.miningReady === true && data?.fundingReady === true;
  }

  static updateMintingProgress(outputIndex, status, data = {}) {
    const current = this.load();
    const progress = current?.mintingProgress || { completed: 0, total: 0, outputs: [] };
    const outputs = [...progress.outputs];
    
    outputs[outputIndex] = { ...outputs[outputIndex], status, ...data, updatedAt: Date.now() };
    const completed = outputs.filter(o => o.status === 'completed').length;

    return this.update({
      mintingProgress: { completed, total: progress.total, outputs }
    });
  }

  static initializeMintingProgress(totalOutputs) {
    const outputs = Array.from({ length: totalOutputs }, (_, i) => ({
      index: i,
      status: 'pending',
      currentSubStep: null,
      miningUtxo: null,  // { txid, vout, amount }
      fundingUtxo: null, // { txid, vout, amount }
      commitTxid: null,
      spellTxid: null,
      error: null,
      createdAt: Date.now()
    }));

    return this.update({
      mintingProgress: { completed: 0, total: totalOutputs, outputs }
    });
  }

  // Check if funding was broadcasted (lock flag)
  static isFundingBroadcasted() {
    const data = this.load();
    return data?.fundingBroadcasted === true;
  }

  // Get stored funding transaction
  static getFundingTransaction() {
    const data = this.load();
    return data?.fundingTransaction || null;
  }

  // Get stored funding analysis
  static getFundingAnalysis() {
    const data = this.load();
    return data?.fundingAnalysis || null;
  }
}

export default TurbomintingModule;
