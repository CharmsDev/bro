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

            const claimSection = document.querySelector('.claim-section');
            if (claimSection) {
                claimSection.classList.add('active');
            }

            console.log('✅ Step 4: Claim Tokens enabled');
        }
    }

    enableWalletVisitStep() {
        const visitWalletBtn = this.dom.get('visitWalletBtn');
        if (visitWalletBtn) {
            visitWalletBtn.classList.remove('disabled');
            visitWalletBtn.style.pointerEvents = 'auto';

            const walletVisitSection = document.querySelector('.wallet-visit-section');
            if (walletVisitSection) {
                walletVisitSection.classList.add('active');
            }

            console.log('✅ Step 5: Visit Wallet enabled');
        }
    }

    updateStepVisualState(step, enabled) {
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
        this.dom.show('walletCreation');
        this.dom.hide('walletDisplay');
        this.dom.hide('monitoringDisplay');
        this.dom.hide('transactionDisplay');

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

        const visitWalletBtn = this.dom.get('visitWalletBtn');
        if (visitWalletBtn) {
            visitWalletBtn.classList.add('disabled');
            visitWalletBtn.style.pointerEvents = 'none';
        }

        const sections = document.querySelectorAll('.wallet-section, .mining-section, .transaction-section, .claim-section, .wallet-visit-section');
        sections.forEach(section => {
            section.classList.remove('completed', 'active');
        });
    }

    initializeMiningStep() {
        this.dom.disable('startMining');
        const startMining = this.dom.get('startMining');
        if (startMining) {
            startMining.style.opacity = '0.5';
        }
    }
}
