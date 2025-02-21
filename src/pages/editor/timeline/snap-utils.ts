import { timeMsToUnits, unitsToTimeMs } from "@designcombo/timeline";

export const SNAP_INTERVAL = 16; // Snap to every 16 beats

export function findNearestSnapPoint(units: number, zoom: number) {
  // Calculate the nearest snap point
  const snapPointUnits = Math.round(units / SNAP_INTERVAL) * SNAP_INTERVAL;
  
  // Convert back to time
  const snapPointTimeMs = unitsToTimeMs(snapPointUnits, zoom);
  
  return {
    units: snapPointUnits,
    timeMs: snapPointTimeMs
  };
}

export function calculateSnapPoints(duration: number, zoom: number) {
  const maxUnits = timeMsToUnits(duration * 1000, zoom);
  const snapPoints = [];
  
  for (let units = 0; units <= maxUnits; units += SNAP_INTERVAL) {
    snapPoints.push(units);
  }
  
  return snapPoints;
}