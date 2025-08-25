export class UIHelpers {
    constructor() {
        this.initialize();
    }

    initialize() {
        this.setupFAQFunctionality();
    }

    setupFAQFunctionality() {
        const faqHeaders = document.querySelectorAll('.faq-header');
        faqHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const toggle = header.querySelector('.faq-toggle');
                const isExpanded = header.classList.contains('expanded');

                // Close all other FAQs
                faqHeaders.forEach(h => {
                    h.classList.remove('expanded');
                    const c = h.nextElementSibling;
                    const t = h.querySelector('.faq-toggle');
                    if (c) c.classList.remove('visible');
                    if (t) t.textContent = '+';
                });

                if (!isExpanded) {
                    header.classList.add('expanded');
                    if (content) content.classList.add('visible');
                    if (toggle) toggle.textContent = '×';
                }
            });
        });
    }

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

    static updateProgressBar(progressElement, percentage) {
        if (progressElement) {
            progressElement.style.width = `${Math.min(Math.max(percentage, 0), 100)}%`;
        }
    }

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

    static showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

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

        const colors = {
            info: '#007bff',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);

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
