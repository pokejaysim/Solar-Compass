const SolarCalculations = {
    calculateJulianDay(date) {
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();
        const hour = date.getUTCHours();
        const minute = date.getUTCMinutes();
        const second = date.getUTCSeconds();
        
        let a = Math.floor((14 - month) / 12);
        let y = year + 4800 - a;
        let m = month + 12 * a - 3;
        
        let jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + 
                  Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
        
        let jd = jdn + (hour - 12) / 24 + minute / 1440 + second / 86400;
        
        return jd;
    },

    calculateJulianCentury(jd) {
        return (jd - 2451545.0) / 36525.0;
    },

    calculateSolarPosition(date, latitude, longitude) {
        const jd = this.calculateJulianDay(date);
        const jc = this.calculateJulianCentury(jd);
        
        const geomMeanLongSun = 280.46646 + jc * (36000.76983 + jc * 0.0003032);
        const geomMeanAnomalySun = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
        
        const eccentEarthOrbit = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
        
        const sunEqOfCtr = Math.sin(Utils.degreesToRadians(geomMeanAnomalySun)) * 
                          (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
                          Math.sin(Utils.degreesToRadians(2 * geomMeanAnomalySun)) * 
                          (0.019993 - 0.000101 * jc) +
                          Math.sin(Utils.degreesToRadians(3 * geomMeanAnomalySun)) * 0.000289;
        
        const sunTrueLong = geomMeanLongSun + sunEqOfCtr;
        
        const sunAppLong = sunTrueLong - 0.00569 - 0.00478 * 
                          Math.sin(Utils.degreesToRadians(125.04 - 1934.136 * jc));
        
        const meanObliqEcliptic = 23 + (26 + ((21.448 - jc * (46.815 + jc * 
                                  (0.00059 - jc * 0.001813)))) / 60) / 60;
        
        const obliqCorr = meanObliqEcliptic + 0.00256 * 
                         Math.cos(Utils.degreesToRadians(125.04 - 1934.136 * jc));
        
        const sunDeclin = Utils.radiansToDegrees(Math.asin(Math.sin(Utils.degreesToRadians(obliqCorr)) * 
                         Math.sin(Utils.degreesToRadians(sunAppLong))));
        
        let varY = Math.tan(Utils.degreesToRadians(obliqCorr / 2)) * 
                   Math.tan(Utils.degreesToRadians(obliqCorr / 2));
        
        const eqOfTime = 4 * Utils.radiansToDegrees(varY * Math.sin(2 * Utils.degreesToRadians(geomMeanLongSun)) -
                        2 * eccentEarthOrbit * Math.sin(Utils.degreesToRadians(geomMeanAnomalySun)) +
                        4 * eccentEarthOrbit * varY * Math.sin(Utils.degreesToRadians(geomMeanAnomalySun)) *
                        Math.cos(2 * Utils.degreesToRadians(geomMeanLongSun)) -
                        0.5 * varY * varY * Math.sin(4 * Utils.degreesToRadians(geomMeanLongSun)) -
                        1.25 * eccentEarthOrbit * eccentEarthOrbit * 
                        Math.sin(2 * Utils.degreesToRadians(geomMeanAnomalySun)));
        
        const timezoneOffset = -date.getTimezoneOffset();
        const trueSolarTime = (date.getHours() * 60 + date.getMinutes() + 
                              date.getSeconds() / 60 + timezoneOffset) + 
                              eqOfTime + 4 * longitude;
        
        let hourAngle = trueSolarTime / 4 - 180;
        if (hourAngle < -180) hourAngle += 360;
        if (hourAngle > 180) hourAngle -= 360;
        
        const latRad = Utils.degreesToRadians(latitude);
        const declinRad = Utils.degreesToRadians(sunDeclin);
        const hourAngleRad = Utils.degreesToRadians(hourAngle);
        
        const zenith = Utils.radiansToDegrees(Math.acos(
            Math.sin(latRad) * Math.sin(declinRad) +
            Math.cos(latRad) * Math.cos(declinRad) * Math.cos(hourAngleRad)
        ));
        
        const elevation = 90 - zenith;
        
        let azimuthDenom = Math.cos(latRad) * Math.sin(Utils.degreesToRadians(zenith));
        let azimuth;
        
        if (Math.abs(azimuthDenom) > 0.001) {
            let azimuthRad = ((Math.sin(latRad) * Math.cos(Utils.degreesToRadians(zenith))) - 
                             Math.sin(declinRad)) / azimuthDenom;
            
            if (Math.abs(azimuthRad) > 1) {
                azimuthRad = azimuthRad < 0 ? -1 : 1;
            }
            
            azimuth = 180 - Utils.radiansToDegrees(Math.acos(azimuthRad));
            
            if (hourAngle > 0) {
                azimuth = -azimuth;
            }
        } else {
            azimuth = latitude > 0 ? 180 : 0;
        }
        
        if (azimuth < 0) {
            azimuth += 360;
        }
        
        const atmosphericRefraction = elevation > 85 ? 0 :
            elevation > 5 ? 58.1 / Math.tan(Utils.degreesToRadians(elevation)) -
                          0.07 / Math.pow(Math.tan(Utils.degreesToRadians(elevation)), 3) +
                          0.000086 / Math.pow(Math.tan(Utils.degreesToRadians(elevation)), 5) :
            elevation > -0.575 ? 1735 + elevation * (-518.2 + elevation * (103.4 + 
                                elevation * (-12.79 + elevation * 0.711))) :
            -20.774 / Math.tan(Utils.degreesToRadians(elevation));
        
        const refractionCorrection = atmosphericRefraction / 3600;
        const correctedElevation = elevation + refractionCorrection;
        
        return {
            azimuth: Utils.normalizeAngle(azimuth),
            elevation: correctedElevation,
            declination: sunDeclin,
            hourAngle: hourAngle,
            julianDay: jd
        };
    },

    calculateOptimalTilt(latitude, dayOfYear) {
        const seasonalAdjustment = 23.5 * Math.sin(Utils.degreesToRadians((dayOfYear - 81) * 360 / 365));
        
        let optimalTilt;
        if (Math.abs(latitude) <= 25) {
            optimalTilt = latitude * 0.87;
        } else if (Math.abs(latitude) <= 50) {
            optimalTilt = latitude * 0.87 + 3.1;
        } else {
            optimalTilt = latitude * 0.76 + 8.5;
        }
        
        const summerTilt = latitude - 15;
        const winterTilt = latitude + 15;
        
        const month = new Date().getMonth();
        if (latitude > 0) {
            if (month >= 3 && month <= 8) {
                optimalTilt = summerTilt;
            } else {
                optimalTilt = winterTilt;
            }
        } else {
            if (month >= 9 || month <= 2) {
                optimalTilt = Math.abs(summerTilt);
            } else {
                optimalTilt = Math.abs(winterTilt);
            }
        }
        
        return Math.max(0, Math.min(90, Math.abs(optimalTilt)));
    },

    calculateOptimalDirection(latitude) {
        return latitude >= 0 ? 180 : 0;
    },

    calculateSunriseSunset(date, latitude, longitude) {
        const jd = this.calculateJulianDay(date);
        const jc = this.calculateJulianCentury(jd);
        
        const eqTime = this.calculateEquationOfTime(jc);
        const decl = this.calculateDeclination(jc);
        
        const latRad = Utils.degreesToRadians(latitude);
        const declRad = Utils.degreesToRadians(decl);
        
        const ha = Utils.radiansToDegrees(Math.acos(-Math.tan(latRad) * Math.tan(declRad)));
        
        const sunrise = 720 - 4 * (longitude + ha) - eqTime;
        const sunset = 720 - 4 * (longitude - ha) - eqTime;
        
        return {
            sunrise: sunrise / 60,
            sunset: sunset / 60,
            dayLength: (sunset - sunrise) / 60
        };
    },

    calculateEquationOfTime(jc) {
        const epsilon = this.calculateObliquityCorrection(jc);
        const l0 = this.calculateGeomMeanLongSun(jc);
        const e = this.calculateEccentricityEarthOrbit(jc);
        const m = this.calculateGeomMeanAnomalySun(jc);
        
        let y = Math.tan(Utils.degreesToRadians(epsilon) / 2);
        y *= y;
        
        const sin2l0 = Math.sin(2 * Utils.degreesToRadians(l0));
        const sinm = Math.sin(Utils.degreesToRadians(m));
        const cos2l0 = Math.cos(2 * Utils.degreesToRadians(l0));
        const sin4l0 = Math.sin(4 * Utils.degreesToRadians(l0));
        const sin2m = Math.sin(2 * Utils.degreesToRadians(m));
        
        const eqTime = y * sin2l0 - 2 * e * sinm + 4 * e * y * sinm * cos2l0 -
                      0.5 * y * y * sin4l0 - 1.25 * e * e * sin2m;
        
        return 4 * Utils.radiansToDegrees(eqTime);
    },

    calculateDeclination(jc) {
        const obliquity = this.calculateObliquityCorrection(jc);
        const lambda = this.calculateSunApparentLong(jc);
        
        const sint = Math.sin(Utils.degreesToRadians(obliquity)) * 
                    Math.sin(Utils.degreesToRadians(lambda));
        const theta = Utils.radiansToDegrees(Math.asin(sint));
        
        return theta;
    },

    calculateGeomMeanLongSun(jc) {
        let l0 = 280.46646 + jc * (36000.76983 + 0.0003032 * jc);
        while (l0 > 360) l0 -= 360;
        while (l0 < 0) l0 += 360;
        return l0;
    },

    calculateGeomMeanAnomalySun(jc) {
        return 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
    },

    calculateEccentricityEarthOrbit(jc) {
        return 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
    },

    calculateSunApparentLong(jc) {
        const omega = 125.04 - 1934.136 * jc;
        const lambda = this.calculateSunTrueLong(jc) - 0.00569 - 
                      0.00478 * Math.sin(Utils.degreesToRadians(omega));
        return lambda;
    },

    calculateSunTrueLong(jc) {
        const l0 = this.calculateGeomMeanLongSun(jc);
        const c = this.calculateSunEqOfCenter(jc);
        return l0 + c;
    },

    calculateSunEqOfCenter(jc) {
        const m = this.calculateGeomMeanAnomalySun(jc);
        const mrad = Utils.degreesToRadians(m);
        const sinm = Math.sin(mrad);
        const sin2m = Math.sin(2 * mrad);
        const sin3m = Math.sin(3 * mrad);
        
        const c = sinm * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
                 sin2m * (0.019993 - 0.000101 * jc) + sin3m * 0.000289;
        
        return c;
    },

    calculateObliquityCorrection(jc) {
        const e0 = this.calculateMeanObliquityOfEcliptic(jc);
        const omega = 125.04 - 1934.136 * jc;
        const e = e0 + 0.00256 * Math.cos(Utils.degreesToRadians(omega));
        return e;
    },

    calculateMeanObliquityOfEcliptic(jc) {
        const seconds = 21.448 - jc * (46.8150 + jc * (0.00059 - jc * 0.001813));
        const e0 = 23.0 + (26.0 + (seconds / 60.0)) / 60.0;
        return e0;
    }
};