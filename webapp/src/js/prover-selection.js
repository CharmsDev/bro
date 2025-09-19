export class ProverSelection {
    constructor(domElements, appState) {
        this.dom = domElements;
        this.appState = appState;
        
        // Load configuration from AppState
        const savedConfig = this.appState.getProverConfig();
        this.isCustomProverMode = savedConfig.isCustomProverMode;
        this.customProverUrl = savedConfig.customProverUrl;
        
        this.initializeEventListeners();
        
        // Apply loaded configuration to UI after DOM is ready
        setTimeout(() => this.applyConfigurationToUI(), 100);
    }

    initializeEventListeners() {
        // Toggle for custom prover
        const customProverToggle = document.getElementById('customProverToggle');
        if (customProverToggle) {
            customProverToggle.addEventListener('click', () => {
                this.toggleCustomProverSection();
            });
        }

        // Charms prover option click
        const charmsProverOption = document.getElementById('charmsProverOption');
        if (charmsProverOption) {
            charmsProverOption.addEventListener('click', () => {
                this.selectCharmsProver();
            });
        }

        // Custom prover URL input
        const customProverUrlInput = document.getElementById('customProverUrl');
        if (customProverUrlInput) {
            customProverUrlInput.addEventListener('input', (e) => {
                this.handleCustomProverUrlChange(e.target.value);
            });
        }
    }

    toggleCustomProverSection() {
        const customProverSection = document.getElementById('customProverSection');
        const charmsProverOption = document.getElementById('charmsProverOption');
        
        if (customProverSection) {
            const isHidden = customProverSection.style.display === 'none';
            
            if (isHidden) {
                // Show custom prover section
                customProverSection.style.display = 'block';
                customProverSection.classList.add('active');
                charmsProverOption.classList.remove('active');
                this.isCustomProverMode = true;
            } else {
                // Hide custom prover section and return to Charms prover
                customProverSection.style.display = 'none';
                customProverSection.classList.remove('active');
                charmsProverOption.classList.add('active');
                this.isCustomProverMode = false;
                this.customProverUrl = '';
                
                // Clear the input
                const customProverUrlInput = document.getElementById('customProverUrl');
                if (customProverUrlInput) {
                    customProverUrlInput.value = '';
                }
            }
            
            // Save configuration to AppState
            this.saveConfiguration();
        }
    }

    selectCharmsProver() {
        const charmsProverOption = document.getElementById('charmsProverOption');
        const customProverSection = document.getElementById('customProverSection');
        
        if (charmsProverOption && customProverSection) {
            charmsProverOption.classList.add('active');
            customProverSection.style.display = 'none';
            customProverSection.classList.remove('active');
            this.isCustomProverMode = false;
            this.customProverUrl = '';
            
            // Clear the input
            const customProverUrlInput = document.getElementById('customProverUrl');
            if (customProverUrlInput) {
                customProverUrlInput.value = '';
            }
            
            // Save configuration to AppState
            this.saveConfiguration();
        }
    }

    handleCustomProverUrlChange(url) {
        this.customProverUrl = url.trim();
        
        // Validate URL format
        if (this.customProverUrl && this.isValidUrl(this.customProverUrl)) {
            console.log('[ProverSelection] Custom prover URL set:', this.customProverUrl);
        }
        
        // Save configuration to AppState whenever URL changes
        this.saveConfiguration();
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Get the current prover configuration
    getProverConfig() {
        if (this.isCustomProverMode && this.customProverUrl && this.isValidUrl(this.customProverUrl)) {
            return {
                type: 'custom',
                url: this.customProverUrl
            };
        }
        
        return {
            type: 'charms',
            url: null // Will use environment variable
        };
    }

    // Check if current configuration is valid
    isConfigurationValid() {
        if (!this.isCustomProverMode) {
            return true; // Charms prover is always valid
        }
        
        return this.customProverUrl && this.isValidUrl(this.customProverUrl);
    }

    // Get display text for current selection
    getCurrentSelectionText() {
        if (this.isCustomProverMode) {
            if (this.customProverUrl && this.isValidUrl(this.customProverUrl)) {
                return `Custom Prover: ${this.customProverUrl}`;
            }
            return 'Custom Prover: Invalid URL';
        }
        
        return 'Charms Prover (Official)';
    }

    // Save configuration to AppState
    saveConfiguration() {
        if (this.appState) {
            this.appState.updateProverConfig({
                isCustomProverMode: this.isCustomProverMode,
                customProverUrl: this.customProverUrl
            });
        }
    }

    // Apply loaded configuration to UI elements
    applyConfigurationToUI() {
        const customProverSection = document.getElementById('customProverSection');
        const charmsProverOption = document.getElementById('charmsProverOption');
        const customProverUrlInput = document.getElementById('customProverUrl');

        if (this.isCustomProverMode && customProverSection && charmsProverOption) {
            // Show custom prover section
            customProverSection.style.display = 'block';
            customProverSection.classList.add('active');
            charmsProverOption.classList.remove('active');
            
            // Set the URL input value
            if (customProverUrlInput && this.customProverUrl) {
                customProverUrlInput.value = this.customProverUrl;
            }
            
            console.log('[ProverSelection] Applied custom prover configuration to UI');
        } else if (charmsProverOption && customProverSection) {
            // Ensure Charms prover is selected
            charmsProverOption.classList.add('active');
            customProverSection.style.display = 'none';
            customProverSection.classList.remove('active');
            
            console.log('[ProverSelection] Applied Charms prover configuration to UI');
        }
    }
}
