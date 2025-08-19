// Individual step execution for minting process
import { signSpellTransaction } from '../../services/bitcoin/signSpellTx.js';

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

            // COMMENTED OUT: Real API call to prover
            // const proverResponse = await this.proverApiService.sendToProver(payload);

            // Mock prover response with new test transactions from prover (must be array format)
            const proverResponse = [
                "0200000001197b2e0e9753261e8cb2eb72d2c255ae99aa2460a7813892dd78baabce6a401f0200000000ffffffff01c034020000000000225120d395f5b49a17f2f06ff03d982130d25cc5042e4d6e97611a9388bdf16fb9415700000000",
                "02000000000102197b2e0e9753261e8cb2eb72d2c255ae99aa2460a7813892dd78baabce6a401f0100000000ffffffff67ebd633332f41b067314e3bdf67526d679efb98eda2334142f4174539e7c8ac0000000000ffffffff03e803000000000000225120a60869f0dbcf1dc659c9cecbaf8050135ea9e8cdc487053f1dc6880949dc684c4e050000000000001600141db4ded10fa155036bfb40717ea68022be899fbbe02c020000000000225120a60869f0dbcf1dc659c9cecbaf8050135ea9e8cdc487053f1dc6880949dc684c000341591b5a2f65fca7c0a1e042e2f8520a83c27932bc115ef68dbdc520d59c3203e5f297b3d2a5b0396328ea626127c3eaf3ff6f3cb878d19f2f967bd09ec8be80f481fdda020063057370656c6c4d080282a36776657273696f6e06627478a1646f75747381a1001b000000035d498080716170705f7075626c69635f696e70757473a18361749820187c18f818ee1871188618e40f187b18d910183218d11849186718bc18a1185218df09187f18720d18d618d81849185718a4182e18d61857188618ee9820186c18730a188c182518251844185a18cd188e18fe18cb188d18ae1865184918dc186418ce187818ef183c18501863181e18e018da18d918ab188f18761818f699010418a41859184c1859181a188e1318b3185a18fe187e18de061318270318c9188116186518a0189b1893181a18be184018321518db18bd18fe1871189a18c918a7186a182b181a18a518d5185218df18ec18ba18521840186b18a418ea18be186518af18271888181e18d2189518d018f6185a18c9183a185b131865185a183a18621828182218f01867188a18f8186f18dd187218e418e0187b184618a018cd188918e01870184e181c187918c018b118291872186918be18d518180418dc183e182118bc1887189018ba182518d518e7185f186e18c31856187018ad18ab18dc0e18a71882185e189118be18c7187b18ff183c18f4188d18df05185a18a31618f5185a182818b7184c18e018c1187a18711894181b18f512183c1860187118a3185c18261864182617186c1840182d184318e218a6189a188e181c0e1879186518fd182018ed1862187418ba18f1184ca24818f018c318ab18ed181d18ce189b1838183e182d0a18cb18bd18f2181d187c13182518b0188c189e0e1851189d186c18241891189018ba188a188e18d3183d1318a618df18df189b18dd18451828183f18b0186d1844182718571819185e18fc185f0118d70818d8186d18fe1885187618ff18ab183b181e183018de18781318a118ae18460718a6183d18c1189b18e718b6187f0618561887188d18271886186f6820cfd13cbd465bdcccc12570969cab2883899d296b65c7f6495d081e256a097b30ac21c0cfd13cbd465bdcccc12570969cab2883899d296b65c7f6495d081e256a097b3000000000"
            ];

            console.log('🧪 Using NEW hardcoded prover response from real mining transaction');

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
        console.log('📡 Broadcasting transactions...');

        // Print signed transactions in hex format for manual testing
        console.log('\n=== SIGNED TRANSACTIONS (HEX) ===');
        const txHexArray = [];
        for (let i = 0; i < signedTransactions.length; i++) {
            const signedTx = signedTransactions[i];
            console.log(`TX ${i + 1} (${signedTx.txid}):`);
            console.log(signedTx.signedHex);
            txHexArray.push(`"${signedTx.signedHex}"`);
        }

        // Print bitcoin-cli command for manual testing
        const bitcoinCliCommand = `bitcoin-cli testmempoolaccept '[${txHexArray.join(',')}]'`;
        console.log('\n=== BITCOIN-CLI TEST COMMAND ===');
        console.log(bitcoinCliCommand);
        console.log('\n=====================================\n');

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
