import { AppController } from './utils/app-controller.js';

document.addEventListener('DOMContentLoaded', async function () {
    // Initialize the main app controller
    const appController = new AppController();

    try {
        await appController.initialize();
        console.log('✅ Application successfully initialized with modular architecture');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        alert('Failed to initialize application. Please refresh the page and try again.');
    }

    // Make app controller available globally for debugging
    window.appController = appController;
});
