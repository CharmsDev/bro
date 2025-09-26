// Transaction domain - manages transaction state (NOT business logic)
export class TransactionDomain {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.data = {
            transaction: null,
            isEnabled: false
        };
    }

    // Transaction getters/setters
    get transaction() { 
        return this.data.transaction; 
    }
    
    set transaction(value) { 
        this.data.transaction = value;
        if (value) {
            // Persist transaction data to localStorage
            localStorage.setItem('bro_transaction_data', JSON.stringify(value));
            console.log('[TransactionDomain] Transaction saved to localStorage:', value.txid);
            
            this.eventBus.emit('transactionCreated', value);
            // When transaction is created, disable Step 2 (mining)
            this.eventBus.emit('step2Disabled');
        }
    }

    // Enable/disable domain
    enable() {
        this.data.isEnabled = true;
        this.eventBus.emit('transactionDomainEnabled');
        console.log('[TransactionDomain] Domain enabled');
    }

    disable() {
        this.data.isEnabled = false;
        this.eventBus.emit('transactionDomainDisabled');
        console.log('[TransactionDomain] Domain disabled');
    }

    get isEnabled() {
        return this.data.isEnabled;
    }

    // Complete transaction creation
    completeTransactionCreation(transactionData) {
        this.transaction = transactionData;
        console.log('[TransactionDomain] Transaction creation completed:', transactionData.txid);
    }

    // Validation methods
    hasTransaction() {
        return !!this.data.transaction;
    }

    canCreateTransaction(walletDomain, miningDomain) {
        return walletDomain.hasWallet() && miningDomain.hasMiningResult();
    }

    // Internal method - ONLY called by reset system
    _resetState() {
        this.data = {
            transaction: null,
            isEnabled: false
        };
        console.log('[TransactionDomain] State reset by reset system');
    }

    // Get domain state
    getState() {
        return {
            hasTransaction: this.hasTransaction(),
            transaction: this.data.transaction
        };
    }
}
