export class StateManager {
    constructor() {
        this.steps = new Map();
        this.currentStep = 1;
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

    // Step management
    registerStep(step) {
        this.steps.set(step.stepNumber, step);
        
        // Listen to step events
        step.on('completed', (data) => {
            this.onStepCompleted(data.step);
        });
        
        // Don't listen to 'activated' events to avoid infinite loops
        // The StateManager controls activation, not the steps
    }

    getStep(stepNumber) {
        return this.steps.get(stepNumber);
    }

    setCurrentStep(stepNumber) {
        // Deactivate all steps
        this.steps.forEach(step => step.deactivate());
        
        // Activate current step
        const currentStepObj = this.steps.get(stepNumber);
        if (currentStepObj) {
            currentStepObj.activate();
            this.currentStep = stepNumber;
            this.emit('stepChanged', { 
                currentStep: stepNumber, 
                completedSteps: this.getCompletedSteps() 
            });
        }
    }

    onStepCompleted(stepNumber) {
        // Auto-advance to next step if available
        const nextStep = stepNumber + 1;
        if (this.steps.has(nextStep)) {
            this.setCurrentStep(nextStep);
        }
        
        this.emit('stepCompleted', { 
            step: stepNumber, 
            completedSteps: this.getCompletedSteps() 
        });
    }

    getCompletedSteps() {
        const completed = [];
        this.steps.forEach(step => {
            if (step.isCompleted) {
                completed.push(step.stepNumber);
            }
        });
        return completed.sort((a, b) => a - b);
    }

    getCurrentStep() {
        return this.currentStep;
    }

    // Initialize from localStorage
    initializeFromStorage() {
        // Load all steps from storage
        this.steps.forEach(step => {
            step.loadFromStorage();
        });

        // Calculate current step based on completion
        this.recalculateCurrentStep();
    }

    recalculateCurrentStep() {
        let calculatedStep = 1;
        
        // Find the highest incomplete step
        for (let i = 1; i <= this.steps.size; i++) {
            const step = this.steps.get(i);
            if (step && step.isCompleted) {
                calculatedStep = i + 1;
            } else {
                break;
            }
        }

        // Ensure we don't go beyond available steps
        if (calculatedStep > this.steps.size) {
            calculatedStep = this.steps.size;
        }

        this.setCurrentStep(calculatedStep);
    }

    // Reset all steps
    reset() {
        this.steps.forEach(step => {
            step.reset();
        });
        this.setCurrentStep(1);
    }
}
