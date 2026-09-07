export function clampPrecipitation(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function taskLoadToPrecipitation(activeTasks: number) {
  return clampPrecipitation(activeTasks * 14);
}

export function payloadToPrecipitation(payloadSize: number) {
  if (payloadSize <= 0) return 0;
  return clampPrecipitation(Math.max(8, Math.ceil(payloadSize / 8)));
}
