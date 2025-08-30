/**
 * Time synchronization service using external APIs
 */
export class TimeProvider {
    constructor() {
        this.timeApis = [
            'http://worldclockapi.com/api/json/utc/now',
            'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
            'http://worldtimeapi.org/api/timezone/UTC'
        ];
    }

    async syncTimeWithServer() {
        for (const apiUrl of this.timeApis) {
            try {
                const response = await fetch(apiUrl);
                if (!response.ok) continue;
                
                const data = await response.json();
                console.log(`Time synced with ${apiUrl}`);
                
                let serverTime;
                if (data.currentDateTime) {
                    // worldclockapi.com format
                    serverTime = new Date(data.currentDateTime);
                } else if (data.dateTime) {
                    // timeapi.io format
                    serverTime = new Date(data.dateTime);
                } else if (data.utc_datetime) {
                    // worldtimeapi.org format
                    serverTime = new Date(data.utc_datetime);
                } else {
                    continue; // Unknown format
                }

                if (isNaN(serverTime.getTime())) continue;
                
                const localTime = new Date();
                const timeDiff = Math.abs(serverTime.getTime() - localTime.getTime());
                
                return {
                    serverTime,
                    localTime,
                    timeDiff,
                    source: apiUrl
                };
            } catch (error) {
                console.warn(`Failed to sync time with ${apiUrl}:`, error.message);
                continue;
            }
        }
        
        throw new Error('All time sync APIs failed');
    }
}
