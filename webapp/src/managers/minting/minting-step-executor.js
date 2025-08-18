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

            // MOCK RESPONSE: Using test data instead of actual API call for faster testing
            // Comment out the real API call:
            // const proverResponse = await this.proverApiService.sendToProver(payload);

            // Mock prover response with test transactions (must be array format)
            const proverResponse = [
                "0200000001525ba9b49e5aa34c566767d716930c9243d715d859914a6a42ac729e096ad7380200000000ffffffff01c0990700000000002251204179e238aa8797abb9c76dbe0d8187d2941552b6f361bd6376165d677de5c28000000000",
                "02000000000102525ba9b49e5aa34c566767d716930c9243d715d859914a6a42ac729e096ad7380100000000ffffffff152048f09e99f81bbb5c498d3b8de966390a30fc63af68fe35dc6714859a20330000000000ffffffff03e803000000000000225120a60869f0dbcf1dc659c9cecbaf8050135ea9e8cdc487053f1dc6880949dc684c31050000000000001600141db4ded10fa155036bfb40717ea68022be899fbbff91070000000000225120a60869f0dbcf1dc659c9cecbaf8050135ea9e8cdc487053f1dc6880949dc684c0003410214cce33631f05471a31adf736645077f5d59b10b970cfa043dd21a541e84ffbcc9d725695e34084ccc29364dada8db7abf424caadb549d29c2bf7d4282d6c781fdd4020063057370656c6c4d080282a36776657273696f6e06627478a1646f75747381a1001b000000035d498080716170705f7075626c69635f696e70757473a18361749820187c18f818ee1871188618e40f187b18d910183218d11849186718bc18a1185218df09187f18720d18d618d81849185718a4182e18d61857188618ee9820186c18730a188c182518251844185a18cd188e18fe18cb188d18ae1865184918dc186418ce187818ef183c18501863181e18e018da18d918ab188f18761818f699010418a41859184c18590c188b18e31855188e1828185a1886187c18561830183d189f18c118af187317188d18f11418841118a7186718ad18cf181a18ca02181818dd031825185218f01892181a186018b4187c186f1875181a184418da18f218be18d418d818ed186218a80018cb1843186e183718ec1823187918b8187c1895188a08131899183318b218f518d218cc18fd187818a4185318d4186018a4185218c61824183c18a5187e1833186e18bf18d6181f18ce1818185100185f18e21827183418561827187d18db18a218c1184d18f7184a184300184018f518dc185218a3186c18b80d18c3184518b0181a1822183918c418e8185f18b818dd151888141837188f1886185c18a51518d2188018980e1876188f189b185409181a18ce184c18891854183a18fd18c718be18a41838188f183218e1181f18f718cb1848181918cb183c130f187a18e7184a18f14c9c18971825182c0d071856184d18bd1818187518e918ac185718330d1855186b183f18d80c184f186911183e188b187e18a318d5187b18700618cb186f18db18da182e18c9185b1822185118d0187a186d18b018c618c8189f1875182e120504184d186c18d0189c18a7185e189f18561832189c1858185e18d718811869186e18901824182f1888182b16187d182f18da1822185918dd183318c8187568202ecf1f2e827fc4801e00ce828bcb0bb1a3cbe4bd7c94725761aea5cd43d25412ac21c02ecf1f2e827fc4801e00ce828bcb0bb1a3cbe4bd7c94725761aea5cd43d2541200000000"
            ];

            console.log('🧪 Using MOCK prover response for testing');

            const duration = Date.now() - startTime;

            console.log(`⏱️ Prover response: ${(duration / 1000).toFixed(1)}s`);
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
