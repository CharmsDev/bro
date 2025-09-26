/**
 * RESET - Simple reset orchestrator
 * 
 * Delegates to specialized reset classes in the reset/ folder
 */
import { ResetManager } from './ResetManager.js';

export class Reset {
    constructor(appState) {
        this.appState = appState;
        this.resetManager = new ResetManager(appState);
    }

    /**
     * COMPLETE RESET - Delegates to ResetManager
     */
    completeReset() {
        return this.resetManager.completeReset();
    }

    /**
     * PARTIAL RESET - Delegates to ResetManager
     */
    partialReset() {
        return this.resetManager.partialReset();
    }

}
