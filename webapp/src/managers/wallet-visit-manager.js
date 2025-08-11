export class WalletVisitManager {
    constructor(domElements, stepController, appState) {
        this.dom = domElements;
        this.stepController = stepController;
        this.appState = appState;
    }

    initialize() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.setupVisitWalletButton();
    }

    setupVisitWalletButton() {
        const visitWalletBtn = this.dom.get('visitWalletBtn');
        if (visitWalletBtn) {
            visitWalletBtn.addEventListener('click', () => {
                this.handleWalletVisit();
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

            console.log('✅ Step 5: Redirected to Charms Wallet');
        } catch (error) {
            console.error('Error visiting wallet:', error);
            console.error('❌ Error opening wallet. Please try again.');
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
        console.log('🔧 WalletVisitManager.enableWalletVisitStep() called');
        const visitWalletBtn = this.dom.get('visitWalletBtn');
        console.log('🔧 visitWalletBtn element:', !!visitWalletBtn);

        if (visitWalletBtn) {
            visitWalletBtn.classList.remove('disabled');
            visitWalletBtn.style.pointerEvents = 'auto';

            const walletVisitSection = document.querySelector('.wallet-visit-section');
            if (walletVisitSection) {
                walletVisitSection.classList.add('active');
            }

            console.log('✅ Step 5: Visit Wallet enabled');
        } else {
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
}
