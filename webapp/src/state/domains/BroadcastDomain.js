// Broadcast domain - manages all broadcast-related state and logic  
export class BroadcastDomain {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.data = {
            broadcastResult: null
        };
    }

    // Broadcast result getters/setters
    get broadcastResult() { 
        return this.data.broadcastResult; 
    }
    
    set broadcastResult(value) { 
        this.data.broadcastResult = value;
        if (value) {
            // Persist broadcast data to localStorage
            localStorage.setItem('bro_broadcast_data', JSON.stringify(value));
            console.log('[BroadcastDomain] Broadcast data saved to localStorage:', value.txid);
            
            this.eventBus.emit('broadcastCompleted', value);
        }
    }

    // Complete broadcast
    completeBroadcast(result) {
        this.broadcastResult = result;
        console.log('[BroadcastDomain] Broadcast completed:', result.txid);
    }

    // Validation methods
    hasBroadcastResult() {
        return !!this.data.broadcastResult;
    }

    canStartMonitoring(transactionDomain) {
        return transactionDomain.hasTransaction();
    }

    // Internal method - ONLY called by reset system
    _resetState() {
        this.data = {
            broadcastResult: null
        };
        console.log('[BroadcastDomain] State reset by reset system');
    }

    // Get domain state
    getState() {
        return {
            hasBroadcastResult: this.hasBroadcastResult(),
            broadcastResult: this.data.broadcastResult
        };
    }
}
