/**
 * MiningPersistence - Handles all mining data persistence
 * Centralized storage management for mining state
 */

import CentralStorage from '../../storage/CentralStorage.js';

export class MiningPersistence {
    static STORAGE_KEY = 'mining';
    static LEGACY_KEY = 'miningProgress';

    /**
     * Save mining state to CentralStorage
     * Maintains compatibility with existing MiningModule structure
     */
    static save(state) {
        try {
            // Get existing data to preserve other fields (result, locked, etc.)
            const existing = CentralStorage.get(this.STORAGE_KEY) || {};
            
            // Update progress section (where MiningModule saves)
            const updatedData = {
                ...existing,
                challenge: state.challenge,
                challengeTxid: state.challengeTxid,
                challengeVout: state.challengeVout,
                timestamp: Date.now(),
                progress: {
                    ...(existing.progress || {}),
                    currentNonce: state.currentNonce.toString(),
                    mode: state.mode,  // ← MODE AQUÍ en progress
                    timestamp: Date.now()
                }
            };
            
            CentralStorage.set(this.STORAGE_KEY, updatedData);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Load mining state from CentralStorage (with legacy migration)
     * Reads from MiningModule structure (progress.mode)
     */
    static load() {
        try {
            let data = CentralStorage.get(this.STORAGE_KEY);
            
            // Migration: Check legacy key if not found
            if (!data) {
                data = this.migrateLegacyData();
            }
            
            if (!data) {
                return null;
            }
            
            // Extract from progress section (MiningModule structure)
            const progress = data.progress || {};
            
            return {
                currentNonce: BigInt(progress.currentNonce || data.currentNonce || 0),
                bestHash: data.bestHash || '',
                bestNonce: BigInt(data.bestNonce || 0),
                bestLeadingZeros: data.bestLeadingZeros || 0,
                challenge: data.challenge || '',
                challengeTxid: data.challengeTxid || '',
                challengeVout: data.challengeVout || 0,
                mode: progress.mode || 'cpu'  // ← LEE DE progress.mode
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Load only the mode (lightweight, for constructor)
     * Reads from progress.mode (MiningModule structure)
     */
    static loadMode() {
        try {
            let data = CentralStorage.get(this.STORAGE_KEY);
            
            if (!data) {
                const legacySaved = localStorage.getItem(this.LEGACY_KEY);
                if (legacySaved) {
                    data = JSON.parse(legacySaved);
                }
            }
            
            const mode = data?.progress?.mode || data?.mode || null;
            return mode || null;
        } catch (error) {
            return null;
        }
    }

    static migrateLegacyData() {
        try {
            const legacySaved = localStorage.getItem(this.LEGACY_KEY);
            if (!legacySaved) return null;
            
            const data = JSON.parse(legacySaved);
            CentralStorage.set(this.STORAGE_KEY, data);
            localStorage.removeItem(this.LEGACY_KEY);
            return data;
        } catch (error) {
            return null;
        }
    }

    static clear() {
        CentralStorage.clear(this.STORAGE_KEY);
        localStorage.removeItem(this.LEGACY_KEY);
    }
}
