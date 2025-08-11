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
        console.log('📡 Step 1: Waiting for transaction confirmation...');

        try {
            const confirmationResult = await this.confirmationMonitor.waitForConfirmation(
                miningResult.txid,
                (progress) => this.uiManager.updateConfirmationProgress(progress, miningResult.txid)
            );

            this.uiManager.updateStepStatus(0, 'completed');
            console.log('✅ Step 1 completed: Transaction confirmed');

            return confirmationResult;
        } catch (error) {
            this.uiManager.updateStepStatus(0, 'error');
            throw new Error(`Confirmation failed: ${error.message}`);
        }
    }

    // Step 2: Generate transaction proof
    async executeStep2_generateProof(miningResult, confirmationData) {
        this.uiManager.updateStepStatus(1, 'active');
        console.log('🔍 Step 2: Generating transaction proof...');

        try {
            const proofData = await this.txProofService.getTxProof(
                miningResult.txid,
                confirmationData.blockHash
            );

            this.txProofService.validateProof(proofData);

            this.uiManager.updateStepStatus(1, 'completed');
            console.log('✅ Step 2 completed: Proof generated');

            return proofData;
        } catch (error) {
            this.uiManager.updateStepStatus(1, 'error');
            throw new Error(`Proof generation failed: ${error.message}`);
        }
    }

    // Step 3: Compose prover payload
    async executeStep3_composePayload(miningResult, proofData, wallet) {
        this.uiManager.updateStepStatus(2, 'active');
        console.log('🔧 Step 3: Composing prover payload...');

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

            const walletData = {
                address: wallet.address
            };

            const payload = await this.proverApiService.generatePayload(
                miningData,
                proofData,
                walletData
            );

            this.uiManager.updateStepStatus(2, 'completed');
            console.log('✅ Step 3 completed: Payload composed');

            return payload;
        } catch (error) {
            this.uiManager.updateStepStatus(2, 'error');
            throw new Error(`Payload composition failed: ${error.message}`);
        }
    }

    // Step 4: Send request to prover API
    async executeStep4_proverApiRequest(payload) {
        this.uiManager.updateStepStatus(3, 'active');
        console.log('🚀 Step 4: Sending request to prover API...');

        try {


            const proverResponse = await this.proverApiService.sendToProver(payload);

            this.proverApiService.validateProverResponse(proverResponse);

            this.uiManager.updateStepStatus(3, 'completed');
            console.log(`✅ Step 4 completed: Received ${proverResponse.length} transactions`);

            return proverResponse;
        } catch (error) {
            this.uiManager.updateStepStatus(3, 'error');
            console.log('💾 Payload guardado en disco para revisión - revisa tu carpeta de Descargas');
            throw new Error(`Prover API request failed: ${error.message}`);
        }
    }

    // Step 5: Sign transactions
    async executeStep5_signTransactions(proverResponse, wallet) {
        this.uiManager.updateStepStatus(4, 'active');
        console.log('🔐 Step 5: Signing transactions...');

        try {
            const signedTransactions = await this.transactionSigner.signProverTransactions(
                proverResponse,
                wallet
            );

            this.transactionSigner.validateSignedTransactions(signedTransactions);

            this.uiManager.updateStepStatus(4, 'completed');
            console.log(`✅ Step 5 completed: ${signedTransactions.length} transactions signed`);

            return signedTransactions;
        } catch (error) {
            this.uiManager.updateStepStatus(4, 'error');
            throw new Error(`Transaction signing failed: ${error.message}`);
        }
    }

    // Step 6: Broadcast transactions
    async executeStep6_broadcastTransactions(signedTransactions) {
        this.uiManager.updateStepStatus(5, 'active');
        console.log('📡 Step 6: Broadcasting transactions...');

        try {
            const broadcastResults = [];

            for (let i = 0; i < signedTransactions.length; i++) {
                const signedTx = signedTransactions[i];

                console.log(`📡 Broadcasting transaction ${i + 1}/${signedTransactions.length}`);

                const result = await this.broadcastService.broadcastTransaction(signedTx.signedHex);

                broadcastResults.push({
                    index: i,
                    txid: signedTx.txid,
                    broadcastTxid: result.txid,
                    success: result.success
                });

                console.log(`✅ Transaction ${i + 1} broadcasted: ${result.txid}`);
            }

            this.uiManager.updateStepStatus(5, 'completed');
            console.log(`✅ Step 6 completed: ${broadcastResults.length} transactions broadcasted`);

            return broadcastResults;
        } catch (error) {
            this.uiManager.updateStepStatus(5, 'error');
            throw new Error(`Transaction broadcasting failed: ${error.message}`);
        }
    }
}
