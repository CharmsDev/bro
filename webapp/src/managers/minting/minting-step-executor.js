// Executes individual steps in the BRO token minting process
import { PROVER_CONFIG } from '../../services/prover/config.js';

// Handles step-by-step execution of the minting workflow
export class MintingStepExecutor {
    constructor(services, uiManager, appState) {
        this.confirmationMonitor = services.confirmationMonitor;
        this.txProofService = services.txProofService;
        this.payloadGenerator = services.payloadGenerator;
        this.proverApiClient = services.proverApiClient;
        this.transactionSigner = services.transactionSigner;
        this.uiManager = uiManager;
        this.appState = appState;
    }

    // Wait for mining transaction confirmation with retry logic
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

    // Generate merkle proof for the mining transaction
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

    // Compose payload for prover API request
    async executeStep3_composePayload(miningResult, proofData, wallet) {
        this.uiManager.updateStepStatus(2, 'active');

        try {
            const miningData = {
                txid: miningResult.txid,
                txHex: miningResult.txHex,
                reward: miningResult.reward,
                changeAmount: miningResult.changeAmount
            };

            console.log('[MintingStepExecutor] DEBUG - Composing payload with data:', {
                miningData,
                proofData,
                walletAddress: wallet?.address
            });

            console.log('[MintingStepExecutor] DEBUG - payloadGenerator:', this.payloadGenerator);
            console.log('[MintingStepExecutor] DEBUG - generatePayload method exists:', typeof this.payloadGenerator?.generatePayload);
            console.log('[MintingStepExecutor] DEBUG - PROVER CONFIG:', PROVER_CONFIG);
            console.log('[MintingStepExecutor] DEBUG - Prover API URL:', PROVER_CONFIG.API_URL);

            const payload = await this.payloadGenerator.generatePayload(
                miningData,
                proofData,
                wallet
            );

            this.uiManager.updateStepStatus(2, 'completed');
            return payload;
        } catch (error) {
            this.uiManager.updateStepStatus(2, 'error');
            throw new Error(`Payload composition failed: ${error.message}`);
        }
    }

    // Send payload to prover API with retry handling
    async executeStep4_proverApiRequest(payload) {
        this.uiManager.updateStepStatus(3, 'active');
        // Show spinner and initialize status ticker
        this.uiManager.showProverSpinner();

        // Message phases - short, activity-focused, no retry references
        const phaseA = [
            'Connecting to Prover Service…',
            'Preparing proof request…',
            'Submitting to proving queue…',
            'Processing request…',
            'Validating submission…'
        ];
        const phaseB = [
            'High volume detected…',
            'Processing may take longer…',
            'Validating proof data…',
            'Queue processing active…',
            'Working on your request…'
        ];
        const phaseC = [
            'High demand - processing continues…',
            'Proof validation in progress…',
            'System under high load…',
            'Processing your proof…',
            'Validation ongoing…'
        ];
        const phaseD = [
            'We will keep your place in the queue…',
            'Processing continues in background…',
            'High demand - please remain patient…',
            'Your proof is being processed…',
            'Validation will complete automatically…'
        ];

        let attemptRef = 1;
        let idxA = 0, idxB = 0, idxC = 0, idxD = 0;

        const pickMessage = () => {
            if (attemptRef <= 1) {
                const msg = phaseA[idxA % phaseA.length]; idxA++; return msg;
            } else if (attemptRef <= 3) {
                const msg = phaseB[idxB % phaseB.length]; idxB++; return msg;
            } else if (attemptRef <= 5) {
                const msg = phaseC[idxC % phaseC.length]; idxC++; return msg;
            } else {
                const msg = phaseD[idxD % phaseD.length]; idxD++; return msg;
            }
        };

        // Rotate the main line every ~12s
        const ticker = setInterval(() => {
            this.uiManager.updateProverStatus(pickMessage());
        }, 12000);
        this.uiManager.setProverStatusTicker(ticker);

        try {
            // Make real prover API request with status callback
            const proverResponse = await this.proverApiClient.sendToProver(payload, ({ phase, attempt, statusCode, nextDelayMs }) => {
                // Track attempt to drive phases
                if (typeof attempt === 'number') attemptRef = attempt;
                
                // Handle different phases
                if (phase === 'start') {
                    if (attempt > 1) {
                        // Pause ticker during retries
                        clearInterval(ticker);
                        this.uiManager.updateProverStatus(`Retrying... (Attempt ${attempt})`);
                    } else {
                        this.uiManager.updateProverStatus(pickMessage());
                    }
                } else if (phase === 'retrying') {
                    const delaySeconds = Math.round(nextDelayMs / 1000);
                    if (statusCode === 'NETWORK_ERROR') {
                        this.uiManager.updateProverStatus(`🌐 Network error. Retrying in ${delaySeconds}s... (Attempt ${attempt})`);
                    } else {
                        this.uiManager.updateProverStatus(`⚠️ Server error ${statusCode}. Retrying in ${delaySeconds}s... (Attempt ${attempt})`);
                    }
                } else if (phase === 'success') {
                    if (attempt > 1) {
                        this.uiManager.updateProverStatus(`✅ Success after ${attempt} attempts`);
                    }
                }
            });
            
            // Cleanup ticker and spinner
            if (typeof this.uiManager.setProverStatusTicker === 'function') {
                this.uiManager.setProverStatusTicker(null);
            }
            this.uiManager.hideProverSpinner();

            this.uiManager.updateStepStatus(3, 'completed');
            return proverResponse;
        } catch (error) {
            // Cleanup ticker and keep progress visible with error status
            clearInterval(ticker);
            if (typeof this.uiManager.setProverStatusTicker === 'function') {
                this.uiManager.setProverStatusTicker(null);
            }
            this.uiManager.hideProverSpinner();
            this.uiManager.updateStepStatus(3, 'error');
            throw new Error(`Prover API request failed: ${error.message}`);
        }
    }

    // Sign commit and spell transactions from prover response
    async executeStep5_signTransactions(proverResponse, wallet, miningResult) {
        this.uiManager.updateStepStatus(4, 'active');

        try {
            // Ensure Bitcoin libraries are loaded before signing
            console.log('[MintingStepExecutor] Checking Bitcoin libraries availability...');
            
            // Wait for libraries to be available with timeout
            let attempts = 0;
            const maxAttempts = 10;
            
            while (attempts < maxAttempts) {
                const bitcoinjs = !!window.bitcoinjs;
                const bip32 = !!window.bip32;
                const tinysecp256k1 = !!window.tinysecp256k1;
                
                console.log(`[MintingStepExecutor] Attempt ${attempts + 1}: bitcoinjs=${bitcoinjs}, bip32=${bip32}, tinysecp256k1=${tinysecp256k1}`);
                
                if (bitcoinjs && bip32 && tinysecp256k1) {
                    console.log('[MintingStepExecutor] ✅ All Bitcoin libraries are ready!');
                    break;
                }
                
                if (attempts === maxAttempts - 1) {
                    throw new Error(`Bitcoin libraries not available after ${maxAttempts} attempts. Missing: ${!bitcoinjs ? 'bitcoinjs ' : ''}${!bip32 ? 'bip32 ' : ''}${!tinysecp256k1 ? 'tinysecp256k1' : ''}`);
                }
                
                console.log('[MintingStepExecutor] Libraries not ready, waiting 500ms...');
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
            
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

            // Debug output for transaction validation
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
            
            // Save signed transactions to localStorage for persistence
            const signedTxData = {
                transactions: signedTransactions,
                status: 'signed',
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('bro_signed_transactions', JSON.stringify(signedTxData));

            // Save signed transactions to application state
            if (!this.appState.step5) {
                this.appState.step5 = {};
            }
            this.appState.step5.signedTransactions = signedTransactions;

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

    // Broadcast signed transactions to Bitcoin network
    async executeStep6_broadcastTransactions(signedTransactions) {
        this.uiManager.updateStepStatus(5, 'active');

        try {
            // Broadcast transaction package to network
            const { broadcastPackage } = await import('../../services/bitcoin/broadcastTx.js');
            const commitTx = signedTransactions.find(tx => tx.type === 'commit');
            const spellTx = signedTransactions.find(tx => tx.type === 'spell');
            const result = await broadcastPackage(
                commitTx,
                spellTx,
                (message) => { /* Silent broadcast progress */ }
            );
            
            // Store minting broadcast data in MintingDomain (Step 5 transactions)
            const mintingData = {
                commitTxid: result.commitData.txid,
                spellTxid: result.spellData.txid,
                status: 'broadcast',
                timestamp: new Date().toISOString(),
                commitData: result.commitData,
                spellData: result.spellData
            };
            
            // Store in MintingDomain for Step 5 summary
            this.appState.mintingDomain.mintingResult = mintingData;
            
            // Also update broadcast domain for Step 4 compatibility
            this.appState.broadcastDomain.completeBroadcast({
                txid: result.spellData.txid, // Use spell transaction as main txid
                commitTxid: result.commitData.txid,
                spellTxid: result.spellData.txid,
                status: 'broadcast',
                timestamp: new Date().toISOString()
            });
            
            // Mark step 5 as completed after successful broadcast
            this.uiManager.updateStepStatus(5, 'completed');
            
            // Note: currentStep will be updated to 6 by MintingManager.completeStep(5)
            
            return result;
            // return result;
        } catch (error) {
            this.uiManager.updateStepStatus(5, 'error');
            throw new Error(`Transaction broadcasting failed: ${error.message}`);
        }
    }
}
