// Individual step execution for minting process
import { signSpellTransaction } from '../../services/bitcoin/signSpellTx.js';

export class MintingStepExecutor {
    constructor(services, uiManager) {
        this.confirmationMonitor = services.confirmationMonitor;
        this.txProofService = services.txProofService;
        this.proverApiService = services.proverApiService;
        this.transactionSigner = services.transactionSigner;
        this.uiManager = uiManager;
    }

    // Step 1: Wait for mining transaction confirmation
    async executeStep1_waitForConfirmation(miningResult) {
        this.uiManager.updateStepStatus(0, 'active');

        try {
            const confirmationResult = await this.confirmationMonitor.waitForConfirmation(
                miningResult.txid,
                (progress) => this.uiManager.updateConfirmationProgress(progress, miningResult.txid)
            );

            this.uiManager.updateStepStatus(0, 'completed');
            return confirmationResult;
        } catch (error) {
            this.uiManager.updateStepStatus(0, 'error');
            throw new Error(`Confirmation failed: ${error.message}`);
        }
    }

    // Step 2: Generate transaction proof
    async executeStep2_generateProof(miningResult, confirmationData) {
        this.uiManager.updateStepStatus(1, 'active');

        try {
            const proofData = await this.txProofService.getTxProof(
                miningResult.txid,
                confirmationData.blockHash
            );

            this.txProofService.validateProof(proofData);
            this.uiManager.updateStepStatus(1, 'completed');
            return proofData;
        } catch (error) {
            this.uiManager.updateStepStatus(1, 'error');
            throw new Error(`Proof generation failed: ${error.message}`);
        }
    }

    // Step 3: Compose prover payload
    async executeStep3_composePayload(miningResult, proofData, wallet) {
        this.uiManager.updateStepStatus(2, 'active');

        try {
            const miningData = {
                txid: miningResult.txid,
                txHex: miningResult.txHex,
                inputTxid: miningResult.inputTxid,
                inputVout: miningResult.inputVout,
                difficulty: miningResult.difficulty,
                reward: miningResult.reward,
                changeAmount: miningResult.changeAmount
            };

            const payload = await this.proverApiService.generatePayload(
                miningData,
                proofData,
                { address: wallet.address }
            );

            this.uiManager.updateStepStatus(2, 'completed');
            return payload;
        } catch (error) {
            this.uiManager.updateStepStatus(2, 'error');
            throw new Error(`Payload composition failed: ${error.message}`);
        }
    }

    // Step 4: Send request to prover API
    async executeStep4_proverApiRequest(payload) {
        this.uiManager.updateStepStatus(3, 'active');

        try {
            const startTime = Date.now();

            // Real API call to prover
            const proverResponse = await this.proverApiService.sendToProver(payload);

            const duration = Date.now() - startTime;

            this.proverApiService.validateProverResponse(proverResponse);
            this.uiManager.updateStepStatus(3, 'completed');

            return proverResponse;
        } catch (error) {
            this.uiManager.updateStepStatus(3, 'error');
            throw new Error(`Prover API request failed: ${error.message}`);
        }
    }

    // Step 5: Sign transactions
    async executeStep5_signTransactions(proverResponse, wallet) {
        this.uiManager.updateStepStatus(4, 'active');

        try {
            const { signCommitTransaction } = await import('../../services/bitcoin/signCommitTx.js');

            const commitTxHex = proverResponse[0];
            const spellTxHex = proverResponse[1];

            // Sign commit transaction
            const commitResult = await signCommitTransaction(commitTxHex);

            // Sign spell transaction using the signed commit transaction
            const spellResult = await signSpellTransaction(
                spellTxHex,
                commitResult.signedHex,
                (message) => { }
            );

            const signedTransactions = [
                {
                    type: 'commit',
                    signedHex: commitResult.signedHex,
                    txid: commitResult.txid
                },
                {
                    type: 'spell',
                    signedHex: spellResult.signedHex,
                    txid: spellResult.txid
                }
            ];

            // Save signed transactions to localStorage for persistence
            const signedTxData = {
                commit: {
                    signedHex: commitResult.signedHex,
                    txid: commitResult.txid
                },
                spell: {
                    signedHex: spellResult.signedHex,
                    txid: spellResult.txid
                },
                status: 'signed',
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('bro_signed_transactions', JSON.stringify(signedTxData));

            this.uiManager.updateStepStatus(4, 'completed');
            return signedTransactions;
        } catch (error) {
            this.uiManager.updateStepStatus(4, 'error');
            throw new Error(`Transaction signing failed: ${error.message}`);
        }
    }

    // Step 6: Broadcast transactions
    async executeStep6_broadcastTransactions(signedTransactions) {
        this.uiManager.updateStepStatus(5, 'active');

        try {
            const { broadcastPackage } = await import('../../services/bitcoin/broadcastTx.js');

            const commitTx = signedTransactions.find(tx => tx.type === 'commit');
            const spellTx = signedTransactions.find(tx => tx.type === 'spell');

            const result = await broadcastPackage(
                commitTx,
                spellTx,
                (message) => { /* Silent broadcast progress */ }
            );

            // Save broadcast results to localStorage for persistence
            const broadcastData = {
                commitTxid: result.commitData.txid,
                spellTxid: result.spellData.txid,
                status: 'broadcast',
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('bro_broadcast_data', JSON.stringify(broadcastData));

            this.uiManager.updateStepStatus(5, 'completed');
            return result;
        } catch (error) {
            this.uiManager.updateStepStatus(5, 'error');
            throw new Error(`Transaction broadcasting failed: ${error.message}`);
        }
    }
}
