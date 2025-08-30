// Countdown Timer Component for Launch Date
export class CountdownTimer {
    constructor() {
        // September 2nd, 2025 at 4:20 PM UTC
        this.launchDate = new Date('2025-09-02T16:20:00Z');
        this.timerElement = null;
        this.intervalId = null;
        this.timeOffset = 0; // Offset from server time
    }

    // Create and inject the countdown bar at the top of the page
    async init() {
        await this.syncTimeWithServer();
        this.createCountdownBar();
        this.startCountdown();
    }

    // Fetch accurate time from external API with multiple fallbacks
    async syncTimeWithServer() {
        // Use HTTPS APIs for production deployment to avoid mixed content errors
        const isProduction = window.location.protocol === 'https:';
        const timeApis = isProduction ? [
            // Production: Only HTTPS APIs with valid SSL certificates
            'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
            'https://worldtimeapi.org/api/timezone/UTC'
        ] : [
            // Development: Include HTTP APIs
            'http://worldclockapi.com/api/json/utc/now',
            'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
            'http://worldtimeapi.org/api/timezone/UTC'
        ];

        for (const apiUrl of timeApis) {
            try {
                const response = await fetch(apiUrl);
                const data = await response.json();
                
                let serverTime;
                if (data.currentDateTime) {
                    // worldclockapi.com format
                    serverTime = new Date(data.currentDateTime);
                } else if (data.dateTime) {
                    // timeapi.io format
                    serverTime = new Date(data.dateTime);
                } else if (data.datetime) {
                    // worldtimeapi.org format
                    serverTime = new Date(data.datetime);
                } else {
                    continue; // Try next API
                }

                const localTime = new Date();
                this.timeOffset = serverTime.getTime() - localTime.getTime();
                console.log(`Time synced with ${apiUrl}`);
                return;
            } catch (error) {
                console.warn(`Failed to sync with ${apiUrl}:`, error.message);
                continue;
            }
        }
        
        console.warn('All time servers failed, using local time');
        this.timeOffset = 0;
    }

    getCurrentTime() {
        return new Date(Date.now() + this.timeOffset);
    }

    createCountdownBar() {
        // Create countdown container
        const countdownBar = document.createElement('div');
        countdownBar.id = 'countdown-bar';
        countdownBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 88px;
            background: #000000;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15), inset 0 -8px 16px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
        `;

        // Create countdown container
        const countdownContainer = document.createElement('div');
        countdownContainer.style.cssText = `
            display: flex;
            gap: 12px;
            align-items: center;
        `;

        // Create time unit containers
        this.timeUnits = {
            days: this.createTimeUnit('Days'),
            hours: this.createTimeUnit('Hours'),
            minutes: this.createTimeUnit('Minutes'),
            seconds: this.createTimeUnit('Seconds')
        };

        // Add time units to container
        Object.values(this.timeUnits).forEach(unit => {
            countdownContainer.appendChild(unit.container);
        });

        // Add UTC indicator
        const utcLabel = document.createElement('div');
        utcLabel.style.cssText = `
            font-size: 10px;
            opacity: 0.7;
            margin-left: 8px;
            font-weight: 500;
        `;
        utcLabel.textContent = 'UTC';

        countdownContainer.appendChild(utcLabel);
        countdownBar.appendChild(countdownContainer);

        // Insert at the very top of the body
        document.body.insertBefore(countdownBar, document.body.firstChild);

        // Adjust body padding to account for fixed countdown bar
        document.body.style.paddingTop = '88px';
    }

    createTimeUnit(label) {
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 60px;
        `;

        const boxElement = document.createElement('div');
        boxElement.style.cssText = `
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            border: 1px solid rgba(255, 255, 255, 0.7);
            border-radius: 8px;
            padding: 6px 8px;
            width: 60px;
            text-align: center;
            backdrop-filter: blur(5px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
        `;

        const valueElement = document.createElement('div');
        valueElement.style.cssText = `
            font-size: 24px;
            font-weight: 700;
            line-height: 1;
            color: white;
        `;

        const labelElement = document.createElement('div');
        labelElement.style.cssText = `
            font-size: 8px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            line-height: 1;
            background: linear-gradient(135deg, #333 0%, #666 100%);
            color: white;
            padding: 2px 4px;
            border-radius: 3px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        `;
        labelElement.textContent = label;

        boxElement.appendChild(valueElement);
        boxElement.appendChild(labelElement);
        container.appendChild(boxElement);

        return { container, value: valueElement, label: labelElement };
    }

    startCountdown() {
        this.updateCountdown(); // Initial update
        this.intervalId = setInterval(() => {
            this.updateCountdown();
        }, 1000);
    }

    updateCountdown() {
        const now = this.getCurrentTime();
        const timeLeft = this.launchDate - now;

        if (timeLeft <= 0) {
            // Replace entire countdown with completion message
            const countdownBar = document.getElementById('countdown-bar');
            countdownBar.innerHTML = `
                <div style="font-size: 24px; font-weight: 700; text-align: center;">
                    🚀 Mint is now open 🚀
                </div>
            `;
            clearInterval(this.intervalId);
            return;
        }

        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        // Update each time unit
        this.timeUnits.days.value.textContent = days.toString().padStart(2, '0');
        this.timeUnits.hours.value.textContent = hours.toString().padStart(2, '0');
        this.timeUnits.minutes.value.textContent = minutes.toString().padStart(2, '0');
        this.timeUnits.seconds.value.textContent = seconds.toString().padStart(2, '0');
    }

    destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        const countdownBar = document.getElementById('countdown-bar');
        if (countdownBar) {
            countdownBar.remove();
        }
        document.body.style.paddingTop = '0';
    }
}
