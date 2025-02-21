/**
 * Taken from Bluestar tool by Eliott
 */


interface TimeResult {
    startTime: number;
    duration: number;
}

class UAFTime {
    private units: number[];
    private isJDN: boolean;

    constructor(beats: number[], isJDN: boolean = false) {
        this.isJDN = isJDN;
        // Initialize units array starting with 0
        this.units = this.makeUnitArray(beats);
    }

    private makeUnitArray(beats: number[]): number[] {
        const units: number[] = [0];

        for (let index = 1; index < beats.length; index++) {
            const delay = beats[index] - beats[index - 1];
            const unit = delay / 24;

            for (let i = 0; i < Math.floor(delay / unit); i++) {
                units.push(units[units.length - 1] + unit);
            }
        }

        return units;
    }

    private getMarker(time: number): number {
        // Find the closest index in units array to the absolute time value
        const marker = this.getClosestIndex(this.units, Math.abs(time));
        // Return negative marker if time is negative, positive otherwise
        return time < 0 ? marker * -1 : marker;
    }

    private getClosestIndex(array: number[], value: number): number {
        let closest = 0;
        let minDiff = Math.abs(array[0] - value);

        for (let i = 1; i < array.length; i++) {
            const diff = Math.abs(array[i] - value);
            if (diff < minDiff) {
                minDiff = diff;
                closest = i;
            }
        }

        return closest;
    }

    makeTime(time: number, duration: number): TimeResult {
        const startTime = this.getMarker(time);
        let finalDuration: number;

        if (this.isJDN) {
            finalDuration = this.getMarker(duration);
        } else {
            const endTime = this.getMarker(time + duration);
            finalDuration = endTime - startTime;
        }

        return {
            startTime,
            duration: finalDuration
        };
    }
}

// Example usage:
/*
const beats: number[] = [0, 48, 96, 144, 192]; // Output from generateBeatMarkers
const calculator = new BeatTimeCalculator(beats);
// Get marker for a specific time
const marker: number = calculator.getMarker(100);
// Calculate time and duration
const [start, duration]: [number, number] = calculator.makeTime(100, 50);
*/
export default UAFTime;