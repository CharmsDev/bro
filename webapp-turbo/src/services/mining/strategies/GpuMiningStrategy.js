/**
 * GpuMiningStrategy - GPU-based mining implementation using WebGPU
 */

export class GpuMiningStrategy {
  /**
   * Run GPU mining loop
   * @param {Object} params - Mining parameters
   * @param {WebGPUCoordinator} params.webGpuCoordinator - WebGPU coordinator instance
   * @param {string} params.challenge - Challenge string
   * @param {Object} params.state - Mining state (currentNonce, bestHash, etc.)
   * @param {Function} params.isRunning - Function to check if mining should continue
   * @param {Function} params.isStopped - Function to check if manually stopped
   * @param {Function} params.onBestHashFound - Callback when better hash found
   * @param {Function} params.onProgress - Callback for progress updates
   * @param {Function} params.onStatusUpdate - Callback for status updates
   * @param {Function} params.fallbackToCpu - Callback to fallback to CPU mining
   * @returns {Promise<void>}
   */
  static async run({
    webGpuCoordinator,
    challenge,
    state,
    isRunning,
    isStopped,
    onBestHashFound,
    onProgress,
    onStatusUpdate,
    fallbackToCpu
  }) {
    try {
      const challengeBuffer = new TextEncoder().encode(challenge);
      const gpuMiner = await webGpuCoordinator.initializeWebGPU(challengeBuffer);
      
      if (!gpuMiner) {
        // GPU not available, fallback to CPU
        return await fallbackToCpu();
      }

      onStatusUpdate('mining', 'GPU mining active...');

      while (isRunning() && !isStopped()) {
        try {
          if (!isRunning() || isStopped()) break;
          
          await webGpuCoordinator.processBatch(state, 100000, (progress) => {
            // Update state from progress
            state.currentNonce = progress.currentNonce;
            state.currentHash = progress.currentHash;
            
            if (progress.isNewBest) {
              state.bestHash = progress.bestHash;
              state.bestNonce = progress.bestNonce;
              state.bestLeadingZeros = progress.bestLeadingZeros;
              onBestHashFound(state.bestHash, state.bestNonce, state.bestLeadingZeros);
            }
            
            onProgress({
              currentNonce: state.currentNonce,
              currentHash: state.currentHash,
              hashRate: progress.hashRate * 1000,
              mode: 'gpu'
            });
          });

          await new Promise(resolve => setTimeout(resolve, 10));

        } catch (error) {
          // Retry on error
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

    } catch (error) {
      onStatusUpdate('error', `GPU mining error: ${error.message}`);
      // Fallback to CPU on critical error
      await fallbackToCpu();
    } finally {
      webGpuCoordinator.destroy();
    }
  }
}
