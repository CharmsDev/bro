import { WebGPUCoordinator } from './WebGpuCoordinator.js';

export class GpuMiningCoordinator {
  constructor(config = {}) {
    this.DEBUG = config.DEBUG || false;
    this.webGpuCoordinator = new WebGPUCoordinator();
    this.saveInterval = config.saveInterval || 500000000;
    this.batchSize = config.batchSize || 100000000;
  }

  async initialize(challenge) {
    const challengeBuffer = new TextEncoder().encode(challenge);
    const gpu = await this.webGpuCoordinator.initializeWebGPU(challengeBuffer);
    
    if (!gpu) {
      throw new Error('WebGPU initialization failed');
    }
    
    return gpu;
  }

  async mine(gpu, state, callbacks = {}) {
    const { onProgress, onBestHash, onSave } = callbacks;
    let lastSavedNonce = state.currentNonce;

    while (state.isRunning) {
      try {
        await this.webGpuCoordinator.processBatch(
          state,
          this.batchSize,
          (progressReport) => {
            if (progressReport.isNewBest && onBestHash) {
              onBestHash({
                hash: progressReport.bestHash,
                nonce: progressReport.bestNonce,
                leadingZeros: progressReport.bestLeadingZeros
              });
            }
            if (onProgress) onProgress(progressReport);
          }
        );

        if ((state.currentNonce - lastSavedNonce) >= this.saveInterval) {
          lastSavedNonce = state.currentNonce;
          if (onSave) onSave(state);
          if (this.DEBUG) {
          }
        }
      } catch (error) {
        throw error;
      }
    }

    if (onSave) onSave(state);
    if (this.DEBUG) {
    }

  }
}
