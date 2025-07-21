document.addEventListener('DOMContentLoaded', function () {
    // Wallet functionality
    let wallet = null;
    let currentWallet = null;

    // Initialize wallet
    if (window.CharmsWallet) {
        wallet = new window.CharmsWallet();
    }

    // Wallet elements
    const createWalletBtn = document.getElementById('createWalletBtn');
    const walletCreation = document.getElementById('walletCreation');
    const walletDisplay = document.getElementById('walletDisplay');
    const walletAddress = document.getElementById('walletAddress');
    const copyAddressBtn = document.getElementById('copyAddressBtn');
    const showSeedBtn = document.getElementById('showSeedBtn');
    const copySeedBtn = document.getElementById('copySeedBtn');
    const seedPhraseDisplay = document.getElementById('seedPhraseDisplay');
    const seedPhraseText = document.getElementById('seedPhraseText');

    // Check if wallet already exists
    if (wallet) {
        const existingWallet = wallet.getStoredWallet();
        if (existingWallet) {
            currentWallet = existingWallet;
            showWalletInfo();
        }
    }

    // Create wallet button
    createWalletBtn.addEventListener('click', async () => {
        if (!wallet) {
            alert('Wallet functionality not available');
            return;
        }

        try {
            // Generate seed phrase and address
            const seedPhrase = wallet.generateSeedPhrase();
            const address = wallet.generateTestnet4Address(seedPhrase, 0);

            // Store wallet
            wallet.storeWallet(seedPhrase, address);
            currentWallet = { seedPhrase, address };

            // Show wallet info
            showWalletInfo();

        } catch (error) {
            console.error('Error creating wallet:', error);
            alert('Error creating wallet. Please try again.');
        }
    });

    // Copy address button
    copyAddressBtn.addEventListener('click', async () => {
        if (currentWallet && wallet) {
            try {
                await wallet.copyToClipboard(currentWallet.address);
                copyAddressBtn.innerHTML = '<span>✓</span>';
                setTimeout(() => {
                    copyAddressBtn.innerHTML = '<span>📋</span>';
                }, 2000);
            } catch (error) {
                console.error('Error copying address:', error);
            }
        }
    });

    // Show seed phrase button
    showSeedBtn.addEventListener('click', () => {
        if (currentWallet) {
            seedPhraseText.textContent = currentWallet.seedPhrase;
            seedPhraseDisplay.style.display = 'block';
            showSeedBtn.style.display = 'none';
            copySeedBtn.style.display = 'inline-block';
        }
    });

    // Copy seed phrase button
    copySeedBtn.addEventListener('click', async () => {
        if (currentWallet && wallet) {
            try {
                await wallet.copyToClipboard(currentWallet.seedPhrase);
                copySeedBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copySeedBtn.textContent = 'Copy Seed Phrase';
                }, 2000);
            } catch (error) {
                console.error('Error copying seed phrase:', error);
            }
        }
    });

    // Show wallet information
    function showWalletInfo() {
        if (currentWallet) {
            walletAddress.textContent = currentWallet.address;
            walletCreation.style.display = 'none';
            walletDisplay.style.display = 'block';
        }
    }

    // FAQ functionality
    const questions = document.querySelectorAll('.question');

    questions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const isActive = question.classList.contains('active');

            // Close all other answers
            questions.forEach(q => {
                q.classList.remove('active');
                q.nextElementSibling.style.display = 'none';
            });

            // Open the clicked answer if it wasn't already active
            if (!isActive) {
                question.classList.add('active');
                answer.style.display = 'block';
            }
        });
    });

    // Mining functionality
    let miner = null;
    const startBtn = document.getElementById('startMining');
    const stopBtn = document.getElementById('stopMining');
    const miningDisplay = document.getElementById('miningDisplay');
    const nonceElement = document.getElementById('nonce');
    const hashElement = document.getElementById('currentHash');
    const statusElement = document.getElementById('status');
    const successMessage = document.getElementById('successMessage');
    const finalNonceElement = document.getElementById('finalNonce');
    const finalHashElement = document.getElementById('finalHash');
    const progressFill = document.getElementById('progressFill');

    // Initialize miner
    if (window.BitcoinMiner) {
        miner = new window.BitcoinMiner();
    }

    // Start mining button
    startBtn.addEventListener('click', async () => {
        if (!miner) {
            alert('Mining functionality not available');
            return;
        }

        // Show mining display and switch buttons
        miningDisplay.style.display = 'block';
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        successMessage.style.display = 'none';

        // Reset UI
        statusElement.textContent = 'Mining...';
        statusElement.className = 'stat-value mining';
        nonceElement.textContent = '0';
        hashElement.textContent = 'Calculating...';
        progressFill.style.width = '0%';

        // Start mining with progress updates
        await miner.startDemo(
            // Progress callback
            (progress) => {
                nonceElement.textContent = progress.nonce.toLocaleString();
                hashElement.textContent = progress.hash;

                // Animate progress bar based on leading zeros
                const leadingZeros = progress.hash.match(/^0*/)[0].length;
                const progressPercent = Math.min((leadingZeros / miner.difficulty) * 100, 95);
                progressFill.style.width = progressPercent + '%';

                // Update hash color based on how close we are
                if (leadingZeros >= miner.difficulty) {
                    hashElement.className = 'hash-value success';
                } else if (leadingZeros >= miner.difficulty - 1) {
                    hashElement.className = 'hash-value close';
                } else {
                    hashElement.className = 'hash-value';
                }
            },
            // Completion callback
            (result) => {
                statusElement.textContent = 'Success!';
                statusElement.className = 'stat-value success';
                progressFill.style.width = '100%';

                // Show success message
                finalNonceElement.textContent = result.nonce.toLocaleString();
                finalHashElement.textContent = result.hash;
                successMessage.style.display = 'block';

                // Reset buttons
                startBtn.style.display = 'inline-block';
                stopBtn.style.display = 'none';
            }
        );
    });

    // Stop mining button
    stopBtn.addEventListener('click', () => {
        if (miner) {
            miner.stop();
        }

        statusElement.textContent = 'Stopped';
        statusElement.className = 'stat-value stopped';

        // Reset buttons
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
    });
});
