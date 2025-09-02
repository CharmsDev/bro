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

        let attempt = 1;
        const maxAttempts = 999; // Unlimited attempts
        const retryDelay = 5000; // 5 seconds

        while (attempt <= maxAttempts) {
            try {
                // Show initial spinner immediately when starting confirmation monitoring
                this.uiManager.updateConfirmationProgress({
                    status: 'pending',
                    retries: 0,
                    maxRetries: maxAttempts,
                    nextCheck: 10, // Initial check in 10 seconds
                    consecutiveErrors: 0,
                    attempt,
                    maxAttempts: maxAttempts === 999 ? 'unlimited' : maxAttempts
                }, miningResult.txid);

                const confirmationResult = await this.confirmationMonitor.waitForConfirmation(
                    miningResult.txid,
                    (progress) => {
                        // Add attempt info to progress
                        const progressWithAttempt = {
                            ...progress,
                            attempt,
                            maxAttempts: maxAttempts === 999 ? 'unlimited' : maxAttempts
                        };
                        this.uiManager.updateConfirmationProgress(progressWithAttempt, miningResult.txid);
                    }
                );

                this.uiManager.updateStepStatus(0, 'completed');
                return confirmationResult;
            } catch (error) {
                console.warn(`[Step1] Confirmation attempt ${attempt} failed:`, error.message);
                
                // Reset the confirmation monitor error state
                this.confirmationMonitor.resetErrorState();
                
                // Show retry status in UI
                this.uiManager.updateConfirmationProgress({
                    status: 'retrying',
                    error: error.message,
                    attempt,
                    nextRetryIn: retryDelay / 1000,
                    maxAttempts: maxAttempts === 999 ? 'unlimited' : maxAttempts
                }, miningResult.txid);

                // Wait before retry (unless it's the last attempt)
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    attempt++;
                } else {
                    this.uiManager.updateStepStatus(0, 'error');
                    throw new Error(`Confirmation failed after ${maxAttempts} attempts: ${error.message}`);
                }
            }
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

    // Step 4: Prover API request
    async executeStep4_proverApiRequest(payload) {
        this.uiManager.updateStepStatus(3, 'active');

        try {
            // ===== COMMENTED OUT: HARDCODED PROVER RESPONSE FOR TESTING =====
            // console.log('🔧 Using hardcoded prover response for faster testing');
            // 
            // // Hardcoded commit and spell transactions for testing
            // const proverResponse = [
            //     // Commit transaction hex (from test-commit-signing.js)
            //     "0200000001df347ce597c56cfa9a6897cda812e2364dfd8a2597cf998c73a8c778b52808ff0200000000ffffffff01c0990700000000002251205a21e4e72abff86b19d0d17631c03d530dbc88d7f0e1122cc61532b32031c19600000000",
            //     // Spell transaction hex (using working example from payloads)
            //     "020000000001014cff92e4f350463d29475b6143b987b5e32902f78806f2a5efc72d98ded9dc4c0000000000ffffffff030000000000000000076a0539303737330903000000000000225120a82f29944d65b86ae6b5e5cc75e294ead6c59391a1edc5e016e3498c67fc7bbb2f9a070000000000225120a82f29944d65b86ae6b5e5cc75e294ead6c59391a1edc5e016e3498c67fc7bbb01404ec23be6516c36b36658e28bebf89829b0d7dd7909d84b958e5d6c1516d35fd5c7d7e13dbd7e730b0938e4e59482f13e1cb99cb917ff829d914216a80a6cfc8300000000"
            // ];
            // 
            // this.uiManager.updateStepStatus(3, 'completed');
            // return proverResponse;
            // ===== END COMMENTED OUT SECTION =====

            // Make real prover API request
            const proverResponse = await this.proverApiService.sendToProver(payload);
            
            this.uiManager.updateStepStatus(3, 'completed');
            return proverResponse;
        } catch (error) {
            this.uiManager.updateStepStatus(3, 'error');
            throw new Error(`Prover API request failed: ${error.message}`);
        }
    }

    // Step 5: Sign transactions
    async executeStep5_signTransactions(proverResponse, wallet, miningResult) {
        this.uiManager.updateStepStatus(4, 'active');

        try {
            const { signCommitTransaction } = await import('../../services/bitcoin/signCommitTx.js');
            const { signSpellTransaction } = await import('../../services/bitcoin/signSpellTx.js');

            const commitTxHex = proverResponse[0];
            const spellTxHex = proverResponse[1];

            // Sign commit transaction with mining transaction hex
            const commitResult = await signCommitTransaction(commitTxHex, miningResult.txHex);

            // Sign spell transaction (prover should provide correctly linked transactions)
            const spellResult = await signSpellTransaction(
                spellTxHex,
                commitResult.signedHex,
                () => {} // Silent callback
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

            // 🔧 DEBUG: Print signed transaction hex and testmempoolaccept commands
            console.log('\n=== SIGNED TRANSACTIONS DEBUG ===');
            console.log('Commit Transaction Hex:');
            console.log(commitResult.signedHex);
            console.log('\nSpell Transaction Hex:');
            console.log(spellResult.signedHex);
            console.log('\n=== TESTMEMPOOLACCEPT COMMANDS ===');
            console.log('bitcoin-cli testmempoolaccept \'["' + commitResult.signedHex + '"]\'');
            console.log('bitcoin-cli testmempoolaccept \'["' + spellResult.signedHex + '"]\'');
            console.log('\n=== SUBMITPACKAGE COMMAND ===');
            console.log('bitcoin-cli submitpackage \'["' + commitResult.signedHex + '","' + spellResult.signedHex + '"]\'');
            console.log('=== END DEBUG ===\n');
            
            // Save signed transactions to localStorage for status persistence
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
            console.error('❌ Step 5 signing error:', error);
            console.error('❌ Error details:', error.message);
            console.error('❌ Stack trace:', error.stack);
            
            this.uiManager.updateStepStatus(4, 'error');
            throw new Error(`Transaction signing failed: ${error.message}`);
        }
    }

    // Step 6: Broadcast transactions (DISABLED FOR DEBUGGING)
    async executeStep6_broadcastTransactions(signedTransactions) {
        this.uiManager.updateStepStatus(5, 'active');

        try {
            // ✅ REAL BROADCAST ENABLED
            const { broadcastPackage } = await import('../../services/bitcoin/broadcastTx.js');
            const commitTx = signedTransactions.find(tx => tx.type === 'commit');
            const spellTx = signedTransactions.find(tx => tx.type === 'spell');
            const result = await broadcastPackage(
                commitTx,
                spellTx,
                (message) => { /* Silent broadcast progress */ }
            );
            
            // Store broadcast data and mark step 5 as completed
            const broadcastData = {
                commitTxid: result.commitData.txid,
                spellTxid: result.spellData.txid,
                status: 'broadcast',
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('bro_broadcast_data', JSON.stringify(broadcastData));
            
            // Mark step 5 as completed after successful broadcast
            this.uiManager.updateStepStatus(5, 'completed');
            
            return result;
            // return result;
        } catch (error) {
            this.uiManager.updateStepStatus(5, 'error');
            throw new Error(`Transaction broadcasting failed: ${error.message}`);
        }
    }
}
