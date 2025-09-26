// Minting domain - manages all minting-related state and logic (Step 5)
export class MintingDomain {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.data = {
            signedTransactions: null,
            mintingResult: null
        };
    }

    // Signed transactions getters/setters
    get signedTransactions() { 
        return this.data.signedTransactions; 
    }
    
    set signedTransactions(value) { 
        this.data.signedTransactions = value;
    }

    // Minting result getters/setters
    get mintingResult() { 
        return this.data.mintingResult; 
    }
    
    set mintingResult(value) { 
        this.data.mintingResult = value;
    }

    // Complete minting broadcast (Step 5 -> Step 6)
    completeMintingBroadcast(result) {
        this.mintingResult = result;
        
        // CRITICAL: Save to Storage so it persists on refresh
        this.saveMintingResultToStorage(result);
        
        this.eventBus.emit('transactionBroadcast', result);
        console.log('[MintingDomain] Minting broadcast completed and saved to Storage');
    }

    // Save minting result to Storage
    async saveMintingResultToStorage(result) {
        try {
            const { Storage } = await import('../storage/Storage.js');
            
            // Save to global state (not step-specific)
            Storage.updateGlobal({
                mintingResult: result
            });
            
            console.log('[MintingDomain] ✅ Minting result saved to Storage:', result);
        } catch (error) {
            console.error('[MintingDomain] ❌ Error saving minting result to Storage:', error);
        }
    }

    // Validation methods
    hasSignedTransactions() {
        return !!this.data.signedTransactions;
    }

    hasMintingResult() {
        return !!this.data.mintingResult;
    }

    // Internal method - ONLY called by reset system
    _resetState() {
        this.data = {
            signedTransactions: null,
            mintingResult: null
        };
        console.log('[MintingDomain] State reset by reset system');
    }

    // Get domain state
    getState() {
        return {
            hasSignedTransactions: this.hasSignedTransactions(),
            hasMintingResult: this.hasMintingResult(),
            signedTransactions: this.data.signedTransactions,
            mintingResult: this.data.mintingResult
        };
    }
}
