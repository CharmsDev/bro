export class StepController {
    constructor(domElements) {
        this.dom = domElements;
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
                buttons: ['visitWalletBtn']
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

        console.log('🔄 Steps initialized:', {
            currentStep: state.currentStep,
            completedSteps: state.completedSteps
        });
    }

    // Update all steps based on current step and completed steps
    updateAllSteps(currentStep, completedSteps) {
        for (let step = 1; step <= 6; step++) {
            const isCompleted = completedSteps.includes(step);
            const isActive = step === currentStep;
            const canAccess = step <= currentStep;

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
            } else if (!canAccess) {
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
                    if (this.appState && this.appState.canStartMining()) {
                        this.enableButton(button);
                    } else {
                        this.disableButton(button);
                    }
                    return;
                }

                if (canAccess && !isCompleted) {
                    this.enableButton(button);
                } else {
                    this.disableButton(button);
                }
            }
        });

        console.log(`🔄 Step ${step} updated:`, { isCompleted, isActive, canAccess });
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
            } else {
                // Show funding monitoring if wallet exists but no UTXO yet
                this.dom.show('fundingMonitoring');
                this.dom.hide('utxoFoundDisplay');
            }
        }

        // Show mining display if mining completed OR if there's mining progress
        if (state.hasMiningResult) {
            this.dom.show('miningDisplay');
            const successMessage = this.dom.get('successMessage');
            if (successMessage) {
                successMessage.style.display = 'block';
            }
        } else if (window.BitcoinMiner) {
            // Check for mining progress (Stop & Claim scenario)
            const miner = new window.BitcoinMiner();
            const miningProgress = miner.loadMiningProgress();
            if (miningProgress) {
                this.dom.show('miningDisplay');
                console.log('🔧 StepController: Showing miningDisplay for saved progress');
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
        console.log('✅ Mining step enabled (via new step system)');
    }

    enableTransactionStep() {
        // This is now handled by updateAllSteps
        console.log('✅ Transaction step enabled (via new step system)');
    }

    enableTransactionCreation(appState) {
        // This is now handled by updateAllSteps
        console.log('✅ Transaction creation enabled (via new step system)');
    }

    enableBroadcastStep() {
        // This is now handled by updateAllSteps
        console.log('✅ Broadcast step enabled (via new step system)');
    }

    enableClaimStep() {
        // This is now handled by updateAllSteps
        console.log('✅ Claim step enabled (via new step system)');
    }

    enableClaimTokensStep() {
        // This is now handled by updateAllSteps
        console.log('✅ Claim tokens step enabled (via new step system)');
    }

    enableWalletVisitStep() {
        // This is now handled by updateAllSteps
        console.log('✅ Wallet visit step enabled (via new step system)');
    }

    updateStepVisualState(step, enabled) {
        // This is now handled by updateAllSteps
        console.log(`✅ Step ${step} visual state updated (via new step system)`);
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
                    if (parseInt(step) === this.STEPS.WALLET_CREATION) {
                        // Enable step 1 buttons (create wallet, load demo)
                        this.enableButton(button);
                    } else {
                        // Disable all other buttons
                        this.disableButton(button);
                    }
                }
            });
        });

        console.log('🔄 All steps reset - Step 1 buttons enabled');
    }

    initializeMiningStep() {
        // This is now handled by updateAllSteps
        console.log('✅ Mining step initialized (via new step system)');
    }
}
