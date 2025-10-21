import { CpuMiner } from './CpuMiner.js';
import { leadingZeros } from './RewardCalculator.js';

export class CpuMiningCoordinator {
  constructor(config = {}) {
    this.DEBUG = config.DEBUG || false;
    this.cpuMiner = new CpuMiner();
    this.saveInterval = config.saveInterval || 1000;
  }

  async mine(state, callbacks = {}) {
    const { onProgress, onBestHash, onSave } = callbacks;
    const challengeBuffer = new TextEncoder().encode(state.challenge);

    while (state.isRunning) {
      const hash = await this.cpuMiner.step(challengeBuffer, state.currentNonce);
      const leadingZerosCount = leadingZeros(hash);

      if (leadingZerosCount > state.bestLeadingZeros) {
        const oldBestHash = state.bestHash;
        const oldBestLZ = state.bestLeadingZeros;

        state.bestHash = hash;
        state.bestNonce = state.currentNonce;
        state.bestLeadingZeros = leadingZerosCount;
        state.currentHash = hash;

        if (this.DEBUG) {
        }

        if (onBestHash) {
          onBestHash({
            hash,
            nonce: state.currentNonce,
            leadingZeros: leadingZerosCount
          });
        }
      }

      if (onProgress) {
        onProgress({
          currentNonce: state.currentNonce,
          currentHash: hash,
          currentLeadingZeros: leadingZerosCount,
          bestHash: state.bestHash,
          bestNonce: state.bestNonce,
          bestLeadingZeros: state.bestLeadingZeros
        });
      }

      if (state.currentNonce % this.saveInterval === 0) {
        if (onSave) onSave(state);
        if (this.DEBUG) {
        }
      }

      state.currentNonce++;
    }
  }
}
