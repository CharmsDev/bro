// UI Helpers - utility functions for UI interactions
export class UIHelpers {
    constructor() {
        this.initialize();
    }

    initialize() {
        this.setupFAQFunctionality();
    }

    setupFAQFunctionality() {
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
    }

    // Utility methods for common UI operations
    static showElement(element) {
        if (element) element.style.display = 'block';
    }

    static hideElement(element) {
        if (element) element.style.display = 'none';
    }

    static toggleElement(element) {
        if (element) {
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }
    }

    static setElementText(element, text) {
        if (element) element.textContent = text;
    }

    static setElementHTML(element, html) {
        if (element) element.innerHTML = html;
    }

    static enableElement(element) {
        if (element) element.disabled = false;
    }

    static disableElement(element) {
        if (element) element.disabled = true;
    }

    static addClassName(element, className) {
        if (element) element.classList.add(className);
    }

    static removeClassName(element, className) {
        if (element) element.classList.remove(className);
    }

    static toggleClassName(element, className) {
        if (element) element.classList.toggle(className);
    }

    // Animation helpers
    static fadeIn(element, duration = 300) {
        if (!element) return;

        element.style.opacity = '0';
        element.style.display = 'block';

        const start = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            element.style.opacity = progress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }

        requestAnimationFrame(animate);
    }

    static fadeOut(element, duration = 300) {
        if (!element) return;

        const start = performance.now();
        const startOpacity = parseFloat(getComputedStyle(element).opacity);

        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            element.style.opacity = startOpacity * (1 - progress);

            if (progress >= 1) {
                element.style.display = 'none';
            } else {
                requestAnimationFrame(animate);
            }
        }

        requestAnimationFrame(animate);
    }

    // Progress bar helper
    static updateProgressBar(progressElement, percentage) {
        if (progressElement) {
            progressElement.style.width = `${Math.min(Math.max(percentage, 0), 100)}%`;
        }
    }

    // Button state helpers
    static setButtonLoading(button, loadingText = 'Loading...') {
        if (button) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText;
        }
    }

    static resetButton(button) {
        if (button && button.dataset.originalText) {
            button.disabled = false;
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }

    // Notification helpers
    static showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '4px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: '10000',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });

        // Set background color based on type
        const colors = {
            info: '#007bff',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);

        // Auto remove
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
}
