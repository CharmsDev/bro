// Step coordination - manages step progression and state
import { Storage } from '../storage/Storage.js';

export class StepCoordinator {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.currentStep = 1;
        this.completedSteps = [];
        
        this.STEPS = {
            WALLET_CREATION: 1,
            MINING: 2,
            TRANSACTION_CREATION: 3,
            BROADCAST: 4,
            CLAIM_TOKENS: 5,
            VISIT_WALLET: 6
        };
    }

    // Get current step
    getCurrentStep() {
        return this.currentStep;
    }

    // Set current step
    setCurrentStep(step) {
        const previousStep = this.currentStep;
        this.currentStep = step;
        
        // Persist step state to localStorage
        Storage.updateGlobal({
            currentStep: step,
            completedSteps: [...this.completedSteps]
        });
        console.log(`[StepCoordinator] Step state saved via Storage system: currentStep=${step}`);
        
        // Emit step change event
        this.eventBus.emit('stepChanged', {
            previousStep,
            currentStep: step,
            completedSteps: [...this.completedSteps]
        });
        
        return this.currentStep;
    }

    // Complete a step
    completeStep(stepNumber) {
        if (!this.completedSteps.includes(stepNumber)) {
            this.completedSteps.push(stepNumber);
            console.log(`[StepCoordinator] Step ${stepNumber} completed`);
            
            // If completing Step 5, advance to Step 6
            if (stepNumber === 5 && this.currentStep === 5) {
                console.log(`[StepCoordinator] 🎯 ADVANCING from Step 5 to Step 6...`);
                this.setCurrentStep(6);
                console.log(`[StepCoordinator] ✅ Advanced from Step ${stepNumber} to Step 6`);
                console.log(`[StepCoordinator] 📍 Current step is now: ${this.currentStep}`);
            } else {
                console.log(`[StepCoordinator] ⚠️ NOT advancing - stepNumber: ${stepNumber}, currentStep: ${this.currentStep}`);
            }
            
            // Persist completed steps to localStorage
            Storage.updateGlobal({
                currentStep: this.currentStep,
                completedSteps: [...this.completedSteps]
            });
        }
        return this.completedSteps;
    }

    // Check if step is completed
    isStepCompleted(stepNumber) {
        return this.completedSteps.includes(stepNumber);
    }

    // Check if step is active
    isStepActive(stepNumber) {
        return this.currentStep === stepNumber;
    }

    // Check if step can be accessed
    canAccessStep(stepNumber) {
        return stepNumber <= this.currentStep;
    }

    // Advance to next step
    advanceToNextStep() {
        if (this.currentStep < this.STEPS.VISIT_WALLET) {
            const nextStep = this.currentStep + 1;
            this.setCurrentStep(nextStep);
            return nextStep;
        }
        return this.currentStep;
    }

    // Internal method - ONLY called by reset system
    _resetState(initialStep = 1, initialCompleted = []) {
        this.currentStep = initialStep;
        this.completedSteps = [...initialCompleted];
        console.log(`[StepCoordinator] State reset to step ${initialStep}`);
    }

    // Get state summary
    getState() {
        return {
            currentStep: this.currentStep,
            completedSteps: [...this.completedSteps],
            steps: { ...this.STEPS }
        };
    }
}
