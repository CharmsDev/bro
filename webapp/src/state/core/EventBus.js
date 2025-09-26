// Central event bus for application-wide communication
export class EventBus {
    constructor() {
        this.listeners = {
            // Wallet events
            walletCreated: [],
            utxoFound: [],
            
            // Mining events  
            miningCompleted: [],
            miningStarted: [],
            miningStopped: [],
            
            // Transaction events
            transactionCreated: [],
            
            // Broadcast events
            broadcastCompleted: [],
            
            // Step coordination events
            stepChanged: [],
            step2Disabled: [],
            
            // UI restoration events
            uiRestorationNeeded: []
        };
    }

    // Add event listener
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    // Remove event listener
    off(event, callback) {
        if (!this.listeners[event]) return;
        const index = this.listeners[event].indexOf(callback);
        if (index > -1) {
            this.listeners[event].splice(index, 1);
        }
    }

    // Emit event to all listeners
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[EventBus] Error in ${event} listener:`, error);
                }
            });
        }
    }

    // Internal method - ONLY called by reset system
    _clearAllListeners() {
        Object.keys(this.listeners).forEach(event => {
            this.listeners[event] = [];
        });
        console.log('[EventBus] All listeners cleared by reset system');
    }
}
