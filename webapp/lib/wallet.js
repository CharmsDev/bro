// Charms Wallet Library - Simple wallet functions for BRO Token webapp

class CharmsWallet {
    constructor() {
        this.network = 'testnet';
    }

    // Generate a simple 12-word seed phrase
    generateSeedPhrase() {
        const words = [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
            'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
            'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
            'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
            'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
            'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
            'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
            'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
            'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry',
            'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
            'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april',
            'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor',
            'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art', 'article',
            'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist', 'assume',
            'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
            'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado',
            'avoid', 'awake', 'aware', 'away', 'awesome', 'awful', 'awkward', 'axis',
            'baby', 'bachelor', 'bacon', 'badge', 'bag', 'balance', 'balcony', 'ball',
            'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base',
            'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become',
            'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt',
            'bench', 'benefit', 'best', 'betray', 'better', 'between', 'beyond', 'bicycle'
        ];

        // Generate 12 random words
        const seedPhrase = [];
        for (let i = 0; i < 12; i++) {
            const randomIndex = Math.floor(Math.random() * words.length);
            seedPhrase.push(words[randomIndex]);
        }

        return seedPhrase.join(' ');
    }

    // Generate a testnet4 taproot address (simplified version)
    generateTestnet4Address(seedPhrase, index = 0) {
        // Simple hash function for demonstration
        const simpleHash = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return Math.abs(hash);
        };

        // Create a deterministic address based on seed phrase and index
        const combined = seedPhrase + index.toString();
        const hash = simpleHash(combined);

        // Generate a testnet4 taproot address (tb1p...)
        const chars = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
        let address = 'tb1p';

        // Generate 58 characters for taproot address
        for (let i = 0; i < 58; i++) {
            const charIndex = (hash + i * 7) % chars.length;
            address += chars[charIndex];
        }

        return address;
    }

    // Copy text to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
    }

    // Store wallet data in localStorage
    storeWallet(seedPhrase, address) {
        const walletData = {
            seedPhrase,
            address,
            created: new Date().toISOString()
        };
        localStorage.setItem('charmsWallet', JSON.stringify(walletData));
    }

    // Retrieve wallet data from localStorage
    getStoredWallet() {
        const stored = localStorage.getItem('charmsWallet');
        return stored ? JSON.parse(stored) : null;
    }

    // Clear stored wallet
    clearWallet() {
        localStorage.removeItem('charmsWallet');
    }
}

// Export for use in other scripts
window.CharmsWallet = CharmsWallet;
