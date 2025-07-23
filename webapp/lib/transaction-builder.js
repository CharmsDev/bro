// Bitcoin Transaction Builder class for creating transactions with mining data
class BitcoinTxBuilder {
    constructor() {
        this.network = 'testnet4';
        this.apiService = new window.BitcoinAPIService();
    }

    // Create a transaction with OP_RETURN data containing hash and nonce
    async createMiningDataTransaction(utxo, miningResult, changeAddress) {
        const tx = new window.BitcoinTransaction();

        // Add input (the UTXO we're spending)
        tx.addInput(utxo.txid, utxo.vout);

        // Create compact OP_RETURN data with mining result
        // Format: "CHARM" + first 32 chars of hash + nonce (4 bytes)
        const hashPrefix = miningResult.hash.substring(0, 32); // First 32 chars of hash
        const nonceHex = miningResult.nonce.toString(16).padStart(8, '0'); // 4 bytes

        const miningData = `CHARM${hashPrefix}${nonceHex}`;

        // Add OP_RETURN output with mining data
        tx.addOpReturnOutput(miningData);

        // Calculate change amount (input - fees)
        const feeAmount = 1000; // 1000 satoshis fee
        const changeAmount = utxo.amount - feeAmount;

        if (changeAmount > 0) {
            // Add change output (simplified P2WPKH script)
            const changeScript = this.createP2WPKHScript(changeAddress);
            tx.addOutput(changeScript, changeAmount);
        }

        return tx;
    }

    // Create P2WPKH script (simplified)
    createP2WPKHScript(address) {
        // This is a simplified version - in reality you'd decode the address
        // For demo purposes, we'll create a mock script
        return '0014' + '0'.repeat(40); // OP_0 + 20 bytes pubkey hash
    }

    // Monitor address for UTXOs using real API
    async monitorAddress(address, onUtxoFound, onStatusUpdate, onError) {
        return this.apiService.monitorAddress(address, onUtxoFound, onStatusUpdate, onError);
    }

    // Validate UTXO has sufficient funds
    validateUtxo(utxo, minimumAmount = 10000) {
        if (!utxo) {
            throw new Error('UTXO is required');
        }

        if (!utxo.txid || !utxo.hasOwnProperty('vout') || !utxo.amount) {
            throw new Error('Invalid UTXO format');
        }

        if (utxo.amount < minimumAmount) {
            throw new Error(`UTXO amount (${utxo.amount}) is below minimum (${minimumAmount})`);
        }

        return true;
    }

    // Validate mining result
    validateMiningResult(miningResult) {
        if (!miningResult) {
            throw new Error('Mining result is required');
        }

        if (!miningResult.hash || !miningResult.hasOwnProperty('nonce')) {
            throw new Error('Invalid mining result format');
        }

        if (typeof miningResult.hash !== 'string' || miningResult.hash.length < 32) {
            throw new Error('Invalid hash format');
        }

        if (typeof miningResult.nonce !== 'number' || miningResult.nonce < 0) {
            throw new Error('Invalid nonce format');
        }

        return true;
    }

    // Create transaction with full validation
    async createValidatedTransaction(utxo, miningResult, changeAddress) {
        // Validate inputs
        this.validateUtxo(utxo);
        this.validateMiningResult(miningResult);

        if (!changeAddress) {
            throw new Error('Change address is required');
        }

        // Create transaction
        return this.createMiningDataTransaction(utxo, miningResult, changeAddress);
    }
}

// Export for use in other scripts
window.BitcoinTxBuilder = BitcoinTxBuilder;
