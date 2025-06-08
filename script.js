class SolarCompassApp {
    constructor() {
        this.location = null;
        this.compass = null;
        this.updateInterval = null;
        this.lastUpdate = null;
        
        this.elements = {
            locationStatus: document.getElementById('location-status'),
            currentTime: document.getElementById('current-time'),
            sunAzimuth: document.getElementById('sun-azimuth'),
            sunElevation: document.getElementById('sun-elevation'),
            optimalDirection: document.getElementById('optimal-direction'),
            optimalTilt: document.getElementById('optimal-tilt'),
            currentHeading: document.getElementById('current-heading'),
            alignmentStatus: document.getElementById('alignment-status'),
            errorMessage: document.getElementById('error-message'),
            compassRose: document.querySelector('.compass-rose'),
            directionArrow: document.querySelector('.direction-arrow'),
            targetIndicator: document.querySelector('.target-indicator'),
            compass: document.getElementById('compass')
        };
        
        this.init();
    }

    async init() {
        try {
            Utils.requestWakeLock();
            
            await this.setupLocation();
            
            await this.setupCompass();
            
            this.startUpdates();
            
            this.updateSolarPosition();
            
        } catch (error) {
            console.error('Initialization error:', error);
            Utils.showError(error.message);
        }
    }

    async setupLocation() {
        try {
            this.elements.locationStatus.textContent = 'Detecting...';
            
            const position = await Utils.getCurrentLocation();
            this.location = position;
            
            const latStr = Utils.formatCoordinate(position.latitude, true);
            const lonStr = Utils.formatCoordinate(position.longitude, false);
            this.elements.locationStatus.textContent = `${latStr}, ${lonStr}`;
            
            console.log('Location obtained:', position);
            
        } catch (error) {
            console.error('Location error:', error);
            
            this.location = {
                latitude: 40.7128,
                longitude: -74.0060
            };
            
            this.elements.locationStatus.textContent = 'Using default (NYC)';
            Utils.showError('Location access denied. Using New York City as default.');
        }
    }

    async setupCompass() {
        this.compass = new Compass();
        
        this.compass.initialize({
            compassRose: this.elements.compassRose,
            directionArrow: this.elements.directionArrow,
            targetIndicator: this.elements.targetIndicator,
            headingDisplay: this.elements.currentHeading,
            alignmentStatus: this.elements.alignmentStatus
        });
        
        if (!this.compass.isSupported) {
            Utils.showError('Compass not supported on this device. Orientation features disabled.');
            return;
        }
        
        try {
            if (Utils.isMobile()) {
                this.elements.compass.addEventListener('click', async () => {
                    try {
                        await this.compass.requestPermission();
                        this.compass.start();
                        Utils.hideError();
                    } catch (error) {
                        Utils.showError('Compass permission denied. Tap the compass to try again.');
                    }
                });
                
                if (!this.compass.needsPermission) {
                    this.compass.hasPermission = true;
                    this.compass.start();
                }
            } else {
                if (await this.compass.requestPermission()) {
                    this.compass.start();
                }
            }
        } catch (error) {
            console.error('Compass setup error:', error);
            Utils.showError('Compass initialization failed. Manual orientation required.');
        }
        
        this.compass.onHeadingUpdate = (heading) => {
            this.onCompassUpdate(heading);
        };
    }

    updateSolarPosition() {
        if (!this.location) return;
        
        const now = new Date();
        this.elements.currentTime.textContent = Utils.formatTime(now);
        
        const solarPosition = SolarCalculations.calculateSolarPosition(
            now,
            this.location.latitude,
            this.location.longitude
        );
        
        this.elements.sunAzimuth.textContent = `${Math.round(solarPosition.azimuth)}°`;
        this.elements.sunElevation.textContent = `${Math.round(solarPosition.elevation)}°`;
        
        const dayOfYear = Utils.getDayOfYear(now);
        const optimalTilt = SolarCalculations.calculateOptimalTilt(
            this.location.latitude,
            dayOfYear
        );
        
        const optimalDirection = SolarCalculations.calculateOptimalDirection(this.location.latitude);
        
        this.elements.optimalDirection.textContent = `${optimalDirection}° ${Utils.getCardinalDirection(optimalDirection)}`;
        this.elements.optimalTilt.textContent = `${Math.round(optimalTilt)}°`;
        
        if (this.compass) {
            this.compass.setTargetHeading(optimalDirection);
        }
        
        if (solarPosition.elevation < 0) {
            Utils.showError('Sun is below horizon. Panel positioning may not be optimal.');
        } else {
            Utils.hideError();
        }
        
        this.lastUpdate = now;
    }

    onCompassUpdate(heading) {
        console.log('Compass heading updated:', heading);
    }

    startUpdates() {
        this.updateInterval = setInterval(() => {
            this.updateSolarPosition();
        }, 60000);
        
        setInterval(() => {
            const now = new Date();
            this.elements.currentTime.textContent = Utils.formatTime(now);
        }, 1000);
    }

    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    destroy() {
        this.stopUpdates();
        if (this.compass) {
            this.compass.stop();
        }
    }
}

let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new SolarCompassApp();
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (app) {
            app.stopUpdates();
        }
    } else {
        if (app) {
            app.updateSolarPosition();
            app.startUpdates();
        }
    }
});

window.addEventListener('beforeunload', () => {
    if (app) {
        app.destroy();
    }
});