// Data validation utilities for minting process
export class MintingDataValidator {

    // Validate prerequisites for minting process
    static validatePrerequisites(state, transaction, broadcastResult) {
        if (!state.hasWallet) {
            throw new Error('Wallet not found. Create wallet first.');
        }

        if (!transaction || !transaction.txid) {
            throw new Error('Transaction not found. Please complete Step 3 (Create Transaction) first.');
        }

        if (!transaction.txHex) {
            throw new Error('Transaction hex not found. Please complete Step 3 (Create Transaction) first.');
        }

        if (!broadcastResult || !broadcastResult.success) {
            throw new Error('Transaction not broadcast. Please complete Step 4 (Broadcast Transaction) first.');
        }

        console.log('✅ All prerequisites met: wallet, transaction, and broadcast completed');
        return true;
    }

    // Extract change amount from transaction data
    static extractChangeAmount(transaction, appState) {
        let changeAmount;

        // Try to get changeAmount from stored outputs first
        if (transaction.outputs && transaction.outputs[2]) {
            changeAmount = transaction.outputs[2].value;
            console.log('✅ Change amount extracted from stored outputs:', changeAmount);
            return changeAmount;
        }

        // Fallback: decode transaction hex using bitcoinjs-lib
        console.log('⚠️ Transaction outputs not found in stored data, decoding from hex...');
        try {
            const bitcoin = window.bitcoin;
            if (!bitcoin) {
                throw new Error('Bitcoin library not available');
            }

            const decodedTx = bitcoin.Transaction.fromHex(transaction.txHex);
            if (decodedTx && decodedTx.outs && decodedTx.outs[2]) {
                changeAmount = decodedTx.outs[2].value;
                console.log('✅ Successfully extracted changeAmount from transaction hex:', changeAmount);
                return changeAmount;
            } else {
                throw new Error('Could not find output at index 2 in decoded transaction');
            }
        } catch (decodeError) {
            console.error('❌ Failed to decode transaction hex:', decodeError);
            throw new Error('Unable to determine change amount from transaction data');
        }
    }

    // Create mining result object from transaction data
    static createMiningResult(transaction, appState) {
        const changeAmount = this.extractChangeAmount(transaction, appState);

        console.log('🎯 Creating mining result with CORRECT transaction data:');
        console.log('  - Using transaction.txid (MINING TX):', transaction.txid);
        console.log('  - NOT extracting from inputs (those are PREVIOUS tx data)');
        console.log('  - Will use vout 1 for input, vout 2 for funding');

        // Use stored transaction reward
        let reward = transaction.reward;

        const result = {
            txid: transaction.txid,           // ← MINING transaction ID (CORRECT)
            txHex: transaction.txHex,         // ← MINING transaction hex
            reward: reward,                   // ← Reward amount
            changeAmount: changeAmount        // ← Calculated change
        };

        console.log('✅ Mining result created (WITHOUT incorrect input extraction):', result);
        return result;
    }

    // Validate mining result data
    static validateMiningResult(miningResult) {
        if (!miningResult) {
            throw new Error('Mining result is required');
        }

        if (!miningResult.txid) {
            throw new Error('Mining transaction ID is required');
        }

        if (!miningResult.txHex) {
            throw new Error('Mining transaction hex is required');
        }

        // NO longer require inputTxid/inputVout - we use the mining txid directly
        console.log('✅ Mining result validation passed (using mining txid directly)');
    }

    // Validate wallet data
    static validateWalletData(wallet) {
        if (!wallet) {
            throw new Error('Wallet not found');
        }

        if (!wallet.address) {
            throw new Error('Wallet address not found');
        }

        console.log('✅ Wallet data validated successfully');
        return true;
    }

    // Validate confirmation data
    static validateConfirmationData(confirmationData) {
        if (!confirmationData) {
            throw new Error('Confirmation data not found');
        }

        if (!confirmationData.blockHash) {
            throw new Error('Block hash not found in confirmation data');
        }

        if (!confirmationData.blockHeight) {
            throw new Error('Block height not found in confirmation data');
        }

        console.log('✅ Confirmation data validated successfully');
        return true;
    }

    // Validate proof data
    static validateProofData(proofData) {
        if (!proofData) {
            throw new Error('Proof data not found');
        }

        if (!proofData.proof) {
            throw new Error('Merkle proof not found');
        }

        if (!proofData.blockHash) {
            throw new Error('Block hash not found in proof data');
        }

        if (!proofData.txid) {
            throw new Error('Transaction ID not found in proof data');
        }

        console.log('✅ Proof data validated successfully');
        return true;
    }

    // Validate prover response
    static validateProverResponse(proverResponse) {
        if (!proverResponse) {
            throw new Error('Prover response not found');
        }

        if (!Array.isArray(proverResponse)) {
            throw new Error('Prover response must be an array');
        }

        if (proverResponse.length === 0) {
            throw new Error('Prover response is empty');
        }

        console.log('✅ Prover response validated successfully');
        return true;
    }

    // Validate signed transactions
    static validateSignedTransactions(signedTransactions) {
        if (!signedTransactions) {
            throw new Error('Signed transactions not found');
        }

        if (!Array.isArray(signedTransactions)) {
            throw new Error('Signed transactions must be an array');
        }

        if (signedTransactions.length === 0) {
            throw new Error('No signed transactions found');
        }

        for (let i = 0; i < signedTransactions.length; i++) {
            const signedTx = signedTransactions[i];
            if (!signedTx.signedHex) {
                throw new Error(`Signed transaction ${i} missing signedHex`);
            }
            if (!signedTx.txid) {
                throw new Error(`Signed transaction ${i} missing txid`);
            }
        }

        console.log('✅ Signed transactions validated successfully');
        return true;
    }
}
