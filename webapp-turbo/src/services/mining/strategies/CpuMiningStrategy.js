/**
 * CpuMiningStrategy - CPU-based mining implementation
 */
import { leadingZeros } from '../RewardCalculator.js';

export class CpuMiningStrategy {
  /**
   * Run CPU mining loop
   * @param {Object} params - Mining parameters
   * @param {CpuMiner} params.cpuMiner - CPU miner instance
   * @param {string} params.challenge - Challenge string
   * @param {Object} params.state - Mining state (currentNonce, bestHash, etc.)
   * @param {Function} params.isRunning - Function to check if mining should continue
   * @param {Function} params.isBetterHash - Function to check if hash is better
   * @param {Function} params.onBestHashFound - Callback when better hash found
   * @param {Function} params.onProgress - Callback for progress updates
   * @param {Function} params.onStatusUpdate - Callback for status updates
   * @returns {Promise<void>}
   */
  static async run({
    cpuMiner,
    challenge,
    state,
    isRunning,
    isBetterHash,
    onBestHashFound,
    onProgress,
    onStatusUpdate
  }) {
    const challengeBuffer = new TextEncoder().encode(challenge);
    let hashCount = 0;
    const startTime = Date.now();

    while (isRunning()) {
      try {
        const hash = await cpuMiner.step(challengeBuffer, state.currentNonce);
        state.currentHash = hash;
        hashCount++;

        const lz = leadingZeros(hash);
        
        if (isBetterHash(hash, lz)) {
          onBestHashFound(hash, state.currentNonce, lz);
        }

        // Progress update every 1000 hashes
        if (Number(state.currentNonce % 1000n) === 0) {
          onProgress({
            currentNonce: state.currentNonce,
            currentHash: hash,
            currentLeadingZeros: lz,
            bestHash: state.bestHash,
            bestNonce: state.bestNonce,
            bestLeadingZeros: state.bestLeadingZeros,
            hashRate: Math.round(hashCount / ((Date.now() - startTime) / 1000)),
            elapsed: Date.now() - startTime
          });
        }

        state.currentNonce++;

        // Yield control every 100 hashes
        if (Number(state.currentNonce % 100n) === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }

      } catch (error) {
        onStatusUpdate('error', `Mining error: ${error.message}`);
        break;
      }
    }
  }
}
