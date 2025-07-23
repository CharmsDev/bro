// Step Controller - manages workflow steps and UI state
export class StepController {
    constructor(domElements) {
        this.dom = domElements;
    }

    enableMiningStep() {
        this.dom.enable('startMining');
        const startMining = this.dom.get('startMining');
        if (startMining) {
            startMining.style.opacity = '1';
            console.log('✅ Mining step enabled');
        }
    }

    enableTransactionStep() {
        // Remove test transaction button
        const generateTestTx = this.dom.get('generateTestTx');
        if (generateTestTx) {
            generateTestTx.style.display = 'none';
        }
        console.log('✅ Transaction step enabled');
    }

    enableTransactionCreation(appState) {
        const createTransaction = this.dom.get('createTransaction');
        if (createTransaction && appState.canCreateTransaction()) {
            createTransaction.disabled = false;
            createTransaction.style.display = 'inline-block';
            console.log('✅ Transaction creation enabled');
        }
    }

    enableClaimTokensStep() {
        const claimTokensBtn = this.dom.get('claimTokensBtn');
        if (claimTokensBtn) {
            claimTokensBtn.classList.remove('disabled');
            claimTokensBtn.style.pointerEvents = 'auto';

            // Add visual indicator to Step 4
            const claimSection = document.querySelector('.claim-section');
            if (claimSection) {
                claimSection.classList.add('active');
            }

            console.log('✅ Step 4: Claim Tokens enabled');
        }
    }

    updateStepVisualState(step, enabled) {
        // Add visual indicators for step completion
        const sections = document.querySelectorAll('.wallet-section, .mining-section, .transaction-section');
        sections.forEach((section, index) => {
            const stepNumber = index + 1;
            if (stepNumber < step) {
                section.classList.add('completed');
            } else if (stepNumber === step && enabled) {
                section.classList.add('active');
            }
        });
    }

    resetAllSteps() {
        // Reset UI to initial state
        this.dom.show('walletCreation');
        this.dom.hide('walletDisplay');
        this.dom.hide('monitoringDisplay');
        this.dom.hide('transactionDisplay');

        // Reset buttons
        this.dom.disable('startMining');
        const createTransaction = this.dom.get('createTransaction');
        if (createTransaction) {
            createTransaction.style.display = 'none';
            createTransaction.disabled = true;
        }

        const claimTokensBtn = this.dom.get('claimTokensBtn');
        if (claimTokensBtn) {
            claimTokensBtn.classList.add('disabled');
            claimTokensBtn.style.pointerEvents = 'none';
        }

        // Reset step visual states
        const sections = document.querySelectorAll('.wallet-section, .mining-section, .transaction-section, .claim-section');
        sections.forEach(section => {
            section.classList.remove('completed', 'active');
        });
    }

    initializeMiningStep() {
        // Initially disable mining
        this.dom.disable('startMining');
        const startMining = this.dom.get('startMining');
        if (startMining) {
            startMining.style.opacity = '0.5';
        }
    }
}
