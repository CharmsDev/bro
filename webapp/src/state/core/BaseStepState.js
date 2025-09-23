export class BaseStepState {
    constructor(stepNumber, stepName) {
        this.stepNumber = stepNumber;
        this.stepName = stepName;
        this.isCompleted = false;
        this.isActive = false;
        this.data = {};
        this.listeners = {};
    }

    // Event system
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    // State management
    complete(data = {}) {
        this.isCompleted = true;
        this.data = { ...this.data, ...data };
        this.emit('completed', { step: this.stepNumber, data: this.data });
    }

    activate() {
        this.isActive = true;
        // Don't emit 'activated' to avoid infinite loops with StateManager
    }

    deactivate() {
        this.isActive = false;
        // Don't emit 'deactivated' to avoid unnecessary events
    }

    reset() {
        this.isCompleted = false;
        this.isActive = false;
        this.data = {};
        this.emit('reset', { step: this.stepNumber });
    }

    // Override in subclasses
    canAdvanceToNext() {
        return this.isCompleted;
    }

    // Override in subclasses
    getStorageKey() {
        return `bro_step${this.stepNumber}_data`;
    }

    // Persistence
    saveToStorage() {
        try {
            localStorage.setItem(this.getStorageKey(), JSON.stringify({
                isCompleted: this.isCompleted,
                isActive: this.isActive,
                data: this.data,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn(`Failed to save ${this.stepName} state:`, error);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.getStorageKey());
            if (saved) {
                const parsed = JSON.parse(saved);
                this.isCompleted = parsed.isCompleted || false;
                this.isActive = parsed.isActive || false;
                this.data = parsed.data || {};
                return true;
            }
        } catch (error) {
            console.warn(`Failed to load ${this.stepName} state:`, error);
        }
        return false;
    }
}
