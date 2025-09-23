import environmentConfig from '../config/environment.js';

export class StepController {
    constructor(domElements) {
        this.dom = domElements;
        this.disableLocks = environmentConfig.getDisableStepLocks?.() === true;
        this.STEPS = {
            WALLET_CREATION: 1,
            MINING: 2,
            TRANSACTION_CREATION: 3,
            BROADCAST: 4,
            CLAIM_TOKENS: 5,
            VISIT_WALLET: 6
        };

        this.stepElements = {
            [this.STEPS.WALLET_CREATION]: {
                section: '.wallet-section',
                buttons: ['createWalletBtn', 'loadDemoWalletBtn']
            },
            [this.STEPS.MINING]: {
                section: '.mining-section',
                buttons: ['startMining']
            },
            [this.STEPS.TRANSACTION_CREATION]: {
                section: '.transaction-section',
                buttons: ['createTransaction']
            },
            [this.STEPS.BROADCAST]: {
                section: '.broadcast-section',
                buttons: ['broadcastTransaction']
            },
            [this.STEPS.CLAIM_TOKENS]: {
                section: '.claim-section',
                buttons: ['claimTokensBtn']
            },
            [this.STEPS.VISIT_WALLET]: {
                section: '.wallet-visit-section',
                buttons: ['visitWalletBtn', 'mintMoreBtn']
            }
        };
    }

    // Initialize step states based on current app state
    initializeSteps(appState) {
        this.appState = appState; // Store reference for button state checks
        const state = appState.getState();

        // Reset all steps first
        this.resetAllSteps();

        // Apply current state
        this.updateAllSteps(state.currentStep, state.completedSteps);

        // Restore data displays if available
        this.restoreDataDisplays(appState);
    }

    // Update all steps based on current step and completed steps
    updateAllSteps(currentStep, completedSteps) {
        // Ensure completedSteps is an array to prevent TypeError
        const safeCompletedSteps = Array.isArray(completedSteps) ? completedSteps : [];
        
        console.log('[StepController] updateAllSteps called - currentStep:', currentStep, 'completedSteps:', safeCompletedSteps);
        
        for (let step = 1; step <= 6; step++) {
            const isCompleted = safeCompletedSteps.includes(step);
            const isActive = step === currentStep;
            const canAccess = this.disableLocks ? true : step <= currentStep;

            if (step === 3) {
                console.log('[StepController] Step 3 - isCompleted:', isCompleted, 'isActive:', isActive, 'canAccess:', canAccess);
            }

            this.updateStepState(step, isCompleted, isActive, canAccess);
        }
    }

    // Update individual step state
    updateStepState(step, isCompleted, isActive, canAccess) {
        const stepConfig = this.stepElements[step];
        if (!stepConfig) return;

        const section = document.querySelector(stepConfig.section);
        if (section) {
            section.classList.remove('completed', 'active', 'disabled');

            if (isCompleted) {
                section.classList.add('completed');
            } else if (isActive) {
                section.classList.add('active');
            } else if (!canAccess && !this.disableLocks) {
                section.classList.add('disabled');
            }
        }

        // Enable/disable buttons with special handling for broadcast and mining
        stepConfig.buttons.forEach(buttonId => {
            const button = this.dom.get(buttonId);
            if (button) {
                // Special case for broadcast button - should be enabled if we're on step 4 or later
                if (buttonId === 'broadcastTransaction') {
                    if (step <= 4 && canAccess) {
                        // Don't disable broadcast button here - let BroadcastComponent handle it
                        return;
                    }
                }

                // Special case for mining button - requires both wallet and UTXO
                if (buttonId === 'startMining') {
                    const canMine = !!(this.appState && this.appState.canStartMining && this.appState.canStartMining());
                    if (canMine) {
                        this.enableButton(button);
                    } else {
                        // Even if locks are disabled, keep functional requirement for mining
                        this.disableButton(button);
                    }
                    return;
                }

                if (buttonId === 'createTransaction') {
                    const hasTransaction = !!(this.appState && this.appState.transaction);
                    if (hasTransaction) {
                        this.disableButton(button);
                        return;
                    }
                }

                // Special case for minting button - enable if broadcast completed
                if (buttonId === 'claimTokensBtn') {
                    const hasBroadcast = !!(this.appState && this.appState.broadcastResult);
                    if (hasBroadcast && step === 5) {
                        this.enableButton(button);
                        return;
                    } else {
                    }
                }

                if ((canAccess && !isCompleted) || this.disableLocks) {
                    if (buttonId === 'createTransaction') {
                        console.log('[StepController] Enabling createTransaction button');
                    }
                    this.enableButton(button);
                } else {
                    if (buttonId === 'createTransaction') {
                        console.log('[StepController] Disabling createTransaction button - canAccess:', canAccess, 'isCompleted:', isCompleted);
                    }
                    this.disableButton(button);
                }
            }
        });

    }

    enableButton(button) {
        button.disabled = false;
        button.classList.remove('disabled');
        button.style.pointerEvents = 'auto';
        button.style.opacity = '1';
    }

    disableButton(button) {
        button.disabled = true;
        button.classList.add('disabled');
        button.style.pointerEvents = 'none';
        button.style.opacity = '0.5';
    }

    // Restore data displays when reloading page
    restoreDataDisplays(appState) {
        const state = appState.getState();

        // Show wallet display if wallet exists
        if (state.hasWallet) {
            this.dom.hide('walletCreation');
            this.dom.show('walletDisplay');

            // Show UTXO found display if UTXO exists
            if (state.hasUtxo) {
                this.dom.show('utxoFoundDisplay');
                this.dom.hide('fundingMonitoring');
                // Force update mining button state when UTXO exists on reload
                setTimeout(() => {
                    this.updateStepState(this.STEPS.MINING, false, false, true);
                }, 100);
            } else {
                // Show funding monitoring if wallet exists but no UTXO yet
                this.dom.show('fundingMonitoring');
                this.dom.hide('utxoFoundDisplay');
            }
        }

        // Show mining display if there's mining progress (prioritize currentNonce over old results)
        if (window.BitcoinMiner) {
            const miner = new window.BitcoinMiner();
            const miningProgress = miner.loadMiningProgress();
            if (miningProgress && miningProgress.nonce > 0) {
                this.dom.show('miningDisplay');
                
                // If we have best hash and best nonce, enable Step 3 (Create Transaction)
                if (miningProgress.bestHash && miningProgress.bestNonce > 0) {
                    setTimeout(() => {
                        this.updateStepState(this.STEPS.TRANSACTION_CREATION, false, false, true);
                    }, 100);
                }
                
                // Show current progress, not old completed result
                return;
            }
        }
        
        // Only show completed result if no current progress
        if (state.hasMiningResult) {
            this.dom.show('miningDisplay');
            const successMessage = this.dom.get('successMessage');
            if (successMessage) {
                successMessage.style.display = 'block';
            }
        }

        // Show transaction display if transaction exists
        if (state.hasTransaction) {
            this.dom.show('transactionDisplay');
        }

        // Show broadcast display if broadcast completed
        if (state.hasBroadcastResult) {
            this.dom.show('broadcastDisplay');
        }
    }

    // Legacy methods for backward compatibility
    enableMiningStep() {
        // This is now handled by updateAllSteps
    }

    enableTransactionStep() {
        // This is now handled by updateAllSteps
    }

    enableTransactionCreation(appState) {
        // This is now handled by updateAllSteps
    }

    enableBroadcastStep() {
        // This is now handled by updateAllSteps
    }

    enableClaimStep() {
        // This is now handled by updateAllSteps
    }

    enableClaimTokensStep() {
        // This is now handled by updateAllSteps
    }

    enableWalletVisitStep() {
        // This is now handled by updateAllSteps
    }

    updateStepVisualState(step, enabled) {
        // This is now handled by updateAllSteps
    }

    resetAllSteps() {
        // Hide all displays
        this.dom.hide('walletDisplay');
        this.dom.hide('miningDisplay');
        this.dom.hide('monitoringDisplay');
        this.dom.hide('transactionDisplay');
        this.dom.hide('broadcastDisplay');
        this.dom.show('walletCreation');

        // Reset all sections
        const sections = document.querySelectorAll('.wallet-section, .mining-section, .transaction-section, .broadcast-section, .claim-section, .wallet-visit-section');
        sections.forEach(section => {
            section.classList.remove('completed', 'active', 'disabled');
        });

        // Set wallet section as active (step 1)
        const walletSection = document.querySelector('.wallet-section');
        if (walletSection) {
            walletSection.classList.add('active');
        }

        // Disable all buttons except step 1 buttons
        Object.entries(this.stepElements).forEach(([step, stepConfig]) => {
            stepConfig.buttons.forEach(buttonId => {
                const button = this.dom.get(buttonId);
                if (button) {
                    if (this.disableLocks) {
                        // Enable all buttons when locks are disabled (mining functional check handled elsewhere)
                        this.enableButton(button);
                    } else {
                        if (parseInt(step) === this.STEPS.WALLET_CREATION) {
                            // Enable step 1 buttons (create wallet, load demo)
                            this.enableButton(button);
                        } else {
                            // Disable all other buttons
                            this.disableButton(button);
                        }
                    }
                }
            });
        });

    }

    initializeMiningStep() {
        // This is now handled by updateAllSteps
    }
}
