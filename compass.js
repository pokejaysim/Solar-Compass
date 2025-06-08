class Compass {
    constructor() {
        this.currentHeading = 0;
        this.targetHeading = 180;
        this.isCalibrated = false;
        this.hasPermission = false;
        this.isSupported = false;
        this.alpha = null;
        this.beta = null;
        this.gamma = null;
        this.magneticDeclination = 0;
        
        this.compassRose = null;
        this.directionArrow = null;
        this.targetIndicator = null;
        this.headingDisplay = null;
        this.alignmentStatus = null;
        
        this.onHeadingUpdate = null;
        this.onPermissionDenied = null;
        
        this.orientationHandler = this.handleOrientation.bind(this);
        this.checkSupport();
    }

    checkSupport() {
        if (window.DeviceOrientationEvent) {
            this.isSupported = true;
            
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                this.needsPermission = true;
            } else {
                this.needsPermission = false;
                this.hasPermission = true;
            }
        } else {
            this.isSupported = false;
        }
    }

    async requestPermission() {
        if (!this.isSupported) {
            throw new Error('Device orientation is not supported on this device');
        }

        if (this.needsPermission) {
            try {
                const response = await DeviceOrientationEvent.requestPermission();
                this.hasPermission = response === 'granted';
                
                if (!this.hasPermission) {
                    throw new Error('Device orientation permission denied');
                }
            } catch (error) {
                this.hasPermission = false;
                throw error;
            }
        }

        return this.hasPermission;
    }

    initialize(elements) {
        this.compassRose = elements.compassRose;
        this.directionArrow = elements.directionArrow;
        this.targetIndicator = elements.targetIndicator;
        this.headingDisplay = elements.headingDisplay;
        this.alignmentStatus = elements.alignmentStatus;
    }

    start() {
        if (!this.hasPermission) {
            console.error('Compass permission not granted');
            return false;
        }

        window.addEventListener('deviceorientationabsolute', this.orientationHandler);
        window.addEventListener('deviceorientation', this.orientationHandler);
        
        return true;
    }

    stop() {
        window.removeEventListener('deviceorientationabsolute', this.orientationHandler);
        window.removeEventListener('deviceorientation', this.orientationHandler);
    }

    handleOrientation(event) {
        if (event.alpha === null || event.alpha === undefined) {
            return;
        }

        this.alpha = event.alpha;
        this.beta = event.beta;
        this.gamma = event.gamma;
        
        let heading;
        
        if (event.webkitCompassHeading !== undefined) {
            heading = event.webkitCompassHeading;
        } else if (event.absolute) {
            heading = 360 - event.alpha;
        } else {
            heading = 360 - event.alpha;
        }
        
        heading = this.applyMagneticDeclination(heading);
        
        this.currentHeading = Utils.normalizeAngle(heading);
        
        this.updateDisplay();
        
        if (this.onHeadingUpdate) {
            this.onHeadingUpdate(this.currentHeading);
        }
        
        if (!this.isCalibrated && this.alpha !== null) {
            this.isCalibrated = true;
        }
    }

    applyMagneticDeclination(heading) {
        return Utils.normalizeAngle(heading + this.magneticDeclination);
    }

    setMagneticDeclination(declination) {
        this.magneticDeclination = declination;
    }

    setTargetHeading(heading) {
        this.targetHeading = Utils.normalizeAngle(heading);
        this.updateDisplay();
    }

    updateDisplay() {
        if (!this.compassRose || !this.directionArrow) return;
        
        const rotation = -this.currentHeading;
        this.compassRose.style.transform = `rotate(${rotation}deg)`;
        
        this.directionArrow.style.transform = `translate(-50%, -100%) rotate(${this.currentHeading}deg)`;
        
        const relativeTarget = Utils.normalizeAngle(this.targetHeading - this.currentHeading);
        this.targetIndicator.style.transform = `translate(-50%, -50%) rotate(${relativeTarget}deg)`;
        
        if (this.headingDisplay) {
            this.headingDisplay.textContent = `${Math.round(this.currentHeading)}°`;
        }
        
        this.updateAlignmentStatus();
    }

    updateAlignmentStatus() {
        if (!this.alignmentStatus) return;
        
        const difference = Utils.calculateAngleDifference(this.currentHeading, this.targetHeading);
        const tolerance = 5;
        
        const statusElement = this.alignmentStatus;
        const iconElement = statusElement.querySelector('.alignment-icon');
        const textElement = statusElement.querySelector('.alignment-text');
        
        if (Math.abs(difference) <= tolerance) {
            statusElement.classList.add('aligned');
            iconElement.textContent = '✓';
            textElement.textContent = 'Aligned!';
        } else {
            statusElement.classList.remove('aligned');
            iconElement.textContent = '⟲';
            
            if (difference > 0) {
                textElement.textContent = `Turn right ${Math.round(Math.abs(difference))}°`;
            } else {
                textElement.textContent = `Turn left ${Math.round(Math.abs(difference))}°`;
            }
        }
    }

    calibrate() {
        const calibrationSteps = [
            "Hold your device flat and level",
            "Move it in a figure-8 pattern",
            "Repeat 2-3 times for best results"
        ];
        
        return calibrationSteps;
    }

    getHeadingInfo() {
        return {
            current: this.currentHeading,
            target: this.targetHeading,
            difference: Utils.calculateAngleDifference(this.currentHeading, this.targetHeading),
            cardinal: Utils.getCardinalDirection(this.currentHeading),
            isCalibrated: this.isCalibrated
        };
    }

    simulateHeading(heading) {
        this.currentHeading = Utils.normalizeAngle(heading);
        this.updateDisplay();
        
        if (this.onHeadingUpdate) {
            this.onHeadingUpdate(this.currentHeading);
        }
    }

    reset() {
        this.currentHeading = 0;
        this.isCalibrated = false;
        this.updateDisplay();
    }
}