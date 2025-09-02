export class WalletVisitManager {
    constructor(domElements, stepController, appState, fundingMonitor = null, miningManager = null) {
        this.dom = domElements;
        this.stepController = stepController;
        this.appState = appState;
        this.fundingMonitor = fundingMonitor;
        // Optional reference to MiningManager so we can reset and update mining UI after Mint More
        this.miningManager = miningManager;
    }

    initialize() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.setupVisitWalletButton();
        this.setupMintMoreButton();
    }

    setupVisitWalletButton() {
        const visitWalletBtn = this.dom.get('visitWalletBtn');
        if (visitWalletBtn) {
            visitWalletBtn.addEventListener('click', () => {
                this.handleWalletVisit();
            });
        }
    }

    setupMintMoreButton() {
        const mintMoreBtn = this.dom.get('mintMoreBtn');
        if (mintMoreBtn) {
            mintMoreBtn.addEventListener('click', () => {
                this.handleMintMore();
            });
        }
    }

    handleWalletVisit() {
        const currentWallet = this.appState.wallet;
        if (!currentWallet || !currentWallet.seedPhrase) {
            console.error('❌ No wallet found. Please create a wallet first.');
            return;
        }

        try {
            const encodedSeed = this.encodeSeedPhrase(currentWallet.seedPhrase);

            const walletUrl = `https://wallet.charms.dev/?seed=${encodedSeed}`;

            window.open(walletUrl, '_blank');

            this.markStepCompleted();

        } catch (error) {
            console.error('Error visiting wallet:', error);
            console.error('❌ Error opening wallet. Please try again.');
        }
    }

    handleMintMore() {
        const currentWallet = this.appState.wallet;
        if (!currentWallet || !currentWallet.seedPhrase) {
            console.error('❌ No wallet found. Please create a wallet first.');
            return;
        }

        try {
            console.log('🔄 Starting partial reset for mint more...');
            
            // Perform partial reset (keeps wallet, clears minting data)
            this.appState.partialReset();
            
            // Reset all UI sections to initial state
            this.resetUIToStep1();
            
            // Start monitoring for new UTXOs
            this.startAddressMonitoring();

            // Ensure Mining UI is reset to a clean state and button reflects current readiness
            if (this.miningManager && typeof this.miningManager.reset === 'function') {
                this.miningManager.reset();
            }
            // Update the Start Mining button text/state immediately after reset
            if (this.miningManager && typeof this.miningManager.updateButtonText === 'function') {
                // Small delay to allow DOM/state updates from reset to settle
                setTimeout(() => this.miningManager.updateButtonText(), 0);
            }
            
            console.log('✅ Partial reset completed. Ready for new minting cycle.');
            
        } catch (error) {
            console.error('Error during mint more reset:', error);
            console.error('❌ Error resetting for new mint. Please try again.');
        }
    }

    encodeSeedPhrase(seedPhrase) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(seedPhrase);

            let base64 = '';
            const bytes = new Uint8Array(data);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                base64 += String.fromCharCode(bytes[i]);
            }

            // URL-safe base64 encoding
            return btoa(base64)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
        } catch (error) {
            console.error('Error encoding seed phrase:', error);
            return encodeURIComponent(seedPhrase);
        }
    }

    enableWalletVisitStep() {
        const visitWalletBtn = this.dom.get('visitWalletBtn');
        const mintMoreBtn = this.dom.get('mintMoreBtn');

        if (visitWalletBtn) {
            visitWalletBtn.classList.remove('disabled');
            visitWalletBtn.style.pointerEvents = 'auto';
        }

        if (mintMoreBtn) {
            mintMoreBtn.classList.remove('disabled');
            mintMoreBtn.style.pointerEvents = 'auto';
        }

        const walletVisitSection = document.querySelector('.wallet-visit-section');
        if (walletVisitSection) {
            walletVisitSection.classList.add('active');
        }

        if (!visitWalletBtn) {
            console.error('❌ visitWalletBtn element not found');
        }
    }

    markStepCompleted() {
        const walletVisitSection = document.querySelector('.wallet-visit-section');
        if (walletVisitSection) {
            walletVisitSection.classList.remove('active');
            walletVisitSection.classList.add('completed');
        }
    }

    resetUIToStep1() {
        // Reset all sections to initial state
        const sections = [
            '.wallet-section',
            '.mining-section', 
            '.transaction-section',
            '.broadcast-section',
            '.claim-section',
            '.wallet-visit-section'
        ];

        sections.forEach(selector => {
            const section = document.querySelector(selector);
            if (section) {
                section.classList.remove('active', 'completed');
                if (selector === '.wallet-section') {
                    section.classList.add('active'); // Step 1 should be active
                } else {
                    section.classList.add('disabled');
                }
            }
        });

        // Reset all buttons to disabled state except wallet creation buttons
        const buttonsToDisable = [
            'startMining', 'stopMining', 'createTransaction', 
            'broadcastTransaction', 'claimTokensBtn', 'visitWalletBtn', 'mintMoreBtn'
        ];

        buttonsToDisable.forEach(btnId => {
            const btn = this.dom.get(btnId);
            if (btn) {
                btn.classList.add('disabled');
                btn.style.pointerEvents = 'none';
            }
        });

        // Hide displays EXCEPT address monitoring and funding monitoring
        const displaysToHide = [
            'miningDisplay', 'transactionDisplay', 'broadcastDisplay',
            'utxoFoundDisplay' // This will hide the "✅ Funds Received!" section
        ];

        displaysToHide.forEach(displayId => {
            const display = document.getElementById(displayId);
            if (display) {
                display.style.display = 'none';
            }
        });

        // Clear UTXO found display data completely
        const foundUtxoTxid = document.getElementById('foundUtxoTxid');
        const foundUtxoVout = document.getElementById('foundUtxoVout');
        const foundUtxoAmount = document.getElementById('foundUtxoAmount');
        
        if (foundUtxoTxid) foundUtxoTxid.textContent = '-';
        if (foundUtxoVout) foundUtxoVout.textContent = '-';
        if (foundUtxoAmount) foundUtxoAmount.textContent = '-';

        // Ensure address monitoring box stays visible
        const addressBox = document.getElementById('addressMonitoringBox');
        if (addressBox) {
            addressBox.style.display = 'block';
        }

        // Ensure funding monitoring stays visible
        const fundingMonitoring = document.getElementById('fundingMonitoring');
        if (fundingMonitoring) {
            fundingMonitoring.style.display = 'block';
        }

        // Clear any broadcast summary boxes
        const broadcastSummary = document.getElementById('bro-broadcast-summary');
        if (broadcastSummary) {
            broadcastSummary.remove();
        }

        // Reset step titles to default state
        // IMPORTANT: provide current step data, otherwise all steps become non-active
        const state = (this.appState && typeof this.appState.getState === 'function')
            ? this.appState.getState()
            : { currentStep: this.appState?.currentStep || 1, completedSteps: this.appState?.completedSteps || [] };
        this.stepController.updateAllSteps(state.currentStep, state.completedSteps);

        // Scroll to Step 1 (wallet section)
        const walletSection = document.querySelector('.wallet-section');
        if (walletSection) {
            walletSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    startAddressMonitoring() {
        // Use the funding monitor if available to properly restart monitoring
        if (this.fundingMonitor) {
            console.log('🔄 Restarting funding monitoring via FundingMonitor...');
            this.fundingMonitor.startFundingMonitoring();
        } else {
            // Fallback: manually show monitoring UI
            console.log('🔄 Starting monitoring UI manually (no FundingMonitor available)...');
            
            if (this.appState.wallet && this.appState.wallet.address) {
                // Show the address monitoring box
                const addressBox = document.getElementById('addressMonitoringBox');
                if (addressBox) {
                    addressBox.style.display = 'block';
                }

                // Show funding monitoring
                const fundingMonitoring = document.getElementById('fundingMonitoring');
                if (fundingMonitoring) {
                    fundingMonitoring.style.display = 'block';
                }

                // Show monitoring animation
                const fundingAnimation = document.getElementById('fundingAnimation');
                if (fundingAnimation) {
                    fundingAnimation.style.display = 'flex';
                }

                // Update status
                const fundingStatus = document.getElementById('fundingStatus');
                if (fundingStatus) {
                    fundingStatus.textContent = 'Waiting for funds...';
                }

                // Emit event to trigger monitoring restart
                this.appState.emit('stepChanged', {
                    step: 1,
                    enabled: true,
                    completedSteps: []
                });
            }
        }
    }
}
