/**
 * Centralized UI helper for common button and step controller operations
 * Eliminates code duplication across managers
 */
export class UIHelper {
    
    /**
     * Updates step controller display
     */
    static updateStepController() {
        if (window.appController?.modules?.stepController) {
            const appState = window.appController.appState;
            window.appController.modules.stepController.updateAllSteps(
                appState.currentStep, 
                appState.completedSteps
            );
        }
    }

    /**
     * Enables mining button
     */
    static enableMiningButton() {
        const button = document.getElementById('startMining');
        if (button) {
            button.disabled = false;
            button.classList.remove('disabled');
            button.style.pointerEvents = 'auto';
            button.style.opacity = '1';
            console.log('[UIHelper] Mining button ENABLED');
        }
    }

    /**
     * Enables transaction button
     */
    static enableTransactionButton() {
        const button = document.getElementById('createTransaction');
        if (button) {
            button.disabled = false;
            button.classList.remove('disabled');
            button.style.pointerEvents = 'auto';
            button.style.opacity = '1';
            console.log('[UIHelper] Transaction button ENABLED');
        }
    }

    /**
     * Enables broadcast button
     */
    static enableBroadcastButton() {
        const button = document.getElementById('broadcastTransaction');
        if (button) {
            button.disabled = false;
            button.classList.remove('disabled');
            button.style.pointerEvents = 'auto';
            button.style.opacity = '1';
            console.log('[UIHelper] Broadcast button ENABLED');
        }
    }

    /**
     * Disables transaction button
     */
    static disableTransactionButton() {
        const button = document.getElementById('createTransaction');
        if (button) {
            button.disabled = true;
            button.classList.add('disabled');
            button.style.pointerEvents = 'none';
            button.style.opacity = '0.5';
            console.log('[UIHelper] Transaction button DISABLED');
        }
    }

    /**
     * Disables mining button permanently
     */
    static disableMiningButton() {
        const button = document.getElementById('startMining');
        if (button) {
            const span = button.querySelector('span');
            if (span) span.textContent = 'Mining Disabled';
            button.disabled = true;
            button.classList.add('disabled');
            button.style.pointerEvents = 'none';
            button.style.opacity = '0.5';
            console.log('[UIHelper] Mining button DISABLED permanently');
        }
    }

    /**
     * Configures button state with text and enabled status
     */
    static setButtonState(buttonId, text, enabled) {
        const button = document.getElementById(buttonId);
        if (button) {
            const span = button.querySelector('span');
            if (span) span.textContent = text;
            
            button.disabled = !enabled;
            if (enabled) {
                button.classList.remove('disabled');
                button.style.pointerEvents = 'auto';
                button.style.opacity = '1';
            } else {
                button.classList.add('disabled');
                button.style.pointerEvents = 'none';
                button.style.opacity = '0.5';
            }
        }
    }
}
