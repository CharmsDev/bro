// Individual step execution for minting process
export class MintingStepExecutor {
    constructor(services, uiManager) {
        this.confirmationMonitor = services.confirmationMonitor;
        this.txProofService = services.txProofService;
        this.proverApiService = services.proverApiService;
        this.transactionSigner = services.transactionSigner;
        this.broadcastService = services.broadcastService;
        this.uiManager = uiManager;
    }

    // Step 1: Wait for mining transaction confirmation
    async executeStep1_waitForConfirmation(miningResult) {
        this.uiManager.updateStepStatus(0, 'active');
        console.log('📡 Waiting for confirmation...');

        try {
            const confirmationResult = await this.confirmationMonitor.waitForConfirmation(
                miningResult.txid,
                (progress) => this.uiManager.updateConfirmationProgress(progress, miningResult.txid)
            );

            this.uiManager.updateStepStatus(0, 'completed');
            console.log('✅ Transaction confirmed');
            return confirmationResult;
        } catch (error) {
            this.uiManager.updateStepStatus(0, 'error');
            throw new Error(`Confirmation failed: ${error.message}`);
        }
    }

    // Step 2: Generate transaction proof
    async executeStep2_generateProof(miningResult, confirmationData) {
        this.uiManager.updateStepStatus(1, 'active');
        console.log('🔍 Generating proof...');

        try {
            const proofData = await this.txProofService.getTxProof(
                miningResult.txid,
                confirmationData.blockHash
            );

            this.txProofService.validateProof(proofData);
            this.uiManager.updateStepStatus(1, 'completed');
            console.log('✅ Proof generated');
            return proofData;
        } catch (error) {
            this.uiManager.updateStepStatus(1, 'error');
            throw new Error(`Proof generation failed: ${error.message}`);
        }
    }

    // Step 3: Compose prover payload
    async executeStep3_composePayload(miningResult, proofData, wallet) {
        this.uiManager.updateStepStatus(2, 'active');
        console.log('🔧 Composing payload...');

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
            console.log('✅ Payload composed');
            return payload;
        } catch (error) {
            this.uiManager.updateStepStatus(2, 'error');
            throw new Error(`Payload composition failed: ${error.message}`);
        }
    }

    // Step 4: Send request to prover API
    async executeStep4_proverApiRequest(payload) {
        this.uiManager.updateStepStatus(3, 'active');
        console.log('🚀 Sending to prover API...');
        
        try {
            const startTime = Date.now();
            const proverResponse = await this.proverApiService.sendToProver(payload);
            const duration = Date.now() - startTime;
            
            console.log(`⏱️ Prover response: ${(duration/1000).toFixed(1)}s`);
            this.proverApiService.validateProverResponse(proverResponse);
            this.uiManager.updateStepStatus(3, 'completed');
            console.log('✅ Prover API successful');
            return proverResponse;
        } catch (error) {
            this.uiManager.updateStepStatus(3, 'error');
            throw new Error(`Prover API request failed: ${error.message}`);
        }
    }

    // Step 5: Sign transactions
    async executeStep5_signTransactions(proverResponse, wallet) {
        this.uiManager.updateStepStatus(4, 'active');
        console.log('🔐 Signing transactions...');

        try {
            const signedTransactions = await this.transactionSigner.signProverTransactions(
                proverResponse,
                wallet
            );

            this.transactionSigner.validateSignedTransactions(signedTransactions);
            this.uiManager.updateStepStatus(4, 'completed');
            console.log(`✅ ${signedTransactions.length} transactions signed`);
            return signedTransactions;
        } catch (error) {
            this.uiManager.updateStepStatus(4, 'error');
            throw new Error(`Transaction signing failed: ${error.message}`);
        }
    }

    // Step 6: Broadcast transactions
    async executeStep6_broadcastTransactions(signedTransactions) {
        this.uiManager.updateStepStatus(5, 'active');
        console.log('📡 Broadcasting transactions...');

        try {
            const broadcastResults = [];

            for (let i = 0; i < signedTransactions.length; i++) {
                const signedTx = signedTransactions[i];
                const result = await this.broadcastService.broadcastTransaction(signedTx.signedHex);

                broadcastResults.push({
                    index: i,
                    txid: signedTx.txid,
                    broadcastTxid: result.txid,
                    success: result.success
                });

                console.log(`✅ TX ${i + 1}: ${result.txid}`);
            }

            this.uiManager.updateStepStatus(5, 'completed');
            console.log(`✅ ${broadcastResults.length} transactions broadcasted`);
            return broadcastResults;
        } catch (error) {
            this.uiManager.updateStepStatus(5, 'error');
            throw new Error(`Transaction broadcasting failed: ${error.message}`);
        }
    }
}
