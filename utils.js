const Utils = {
    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    let message = 'Unable to get location';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            message = 'Location permission denied. Please enable location access.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message = 'Location information unavailable.';
                            break;
                        case error.TIMEOUT:
                            message = 'Location request timed out.';
                            break;
                    }
                    reject(new Error(message));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 30000
                }
            );
        });
    },

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    },

    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    },

    radiansToDegrees(radians) {
        return radians * (180 / Math.PI);
    },

    normalizeAngle(angle) {
        while (angle < 0) angle += 360;
        while (angle >= 360) angle -= 360;
        return angle;
    },

    getCardinalDirection(degrees) {
        const normalized = this.normalizeAngle(degrees);
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                          'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(normalized / 22.5) % 16;
        return directions[index];
    },

    calculateAngleDifference(angle1, angle2) {
        let diff = angle2 - angle1;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return diff;
    },

    formatCoordinate(value, isLatitude) {
        const absolute = Math.abs(value);
        const degrees = Math.floor(absolute);
        const minutes = Math.floor((absolute - degrees) * 60);
        const seconds = Math.round(((absolute - degrees) * 60 - minutes) * 60);
        
        const direction = isLatitude 
            ? (value >= 0 ? 'N' : 'S')
            : (value >= 0 ? 'E' : 'W');
        
        return `${degrees}°${minutes}'${seconds}"${direction}`;
    },

    getTimezoneOffset(date) {
        return -date.getTimezoneOffset() / 60;
    },

    getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    },

    isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    },

    showError(message) {
        const errorElement = document.getElementById('error-message');
        const errorText = errorElement.querySelector('.error-text');
        errorText.textContent = message;
        errorElement.style.display = 'flex';
        
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    },

    hideError() {
        const errorElement = document.getElementById('error-message');
        errorElement.style.display = 'none';
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    checkDeviceOrientation() {
        return new Promise((resolve) => {
            if (window.DeviceOrientationEvent) {
                if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                    DeviceOrientationEvent.requestPermission()
                        .then(response => {
                            if (response === 'granted') {
                                resolve(true);
                            } else {
                                resolve(false);
                            }
                        })
                        .catch(() => resolve(false));
                } else {
                    resolve(true);
                }
            } else {
                resolve(false);
            }
        });
    },

    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    requestWakeLock() {
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen')
                .then(wakeLock => {
                    console.log('Wake lock acquired');
                    return wakeLock;
                })
                .catch(err => {
                    console.log('Wake lock request failed:', err);
                });
        }
    }
};